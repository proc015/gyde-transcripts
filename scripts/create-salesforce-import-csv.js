#!/usr/bin/env node

/**
 * CREATE SALESFORCE IMPORT CSV
 *
 * Creates a complete, combined CSV file ready for Salesforce import.
 * Includes:
 * - Transcript metadata
 * - Salesforce Contact/Account names (for verification)
 * - Google Drive URLs (auto-fetched)
 * - Match status
 *
 * Run with: npm run create-import-csv
 */

import fs from 'fs';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const TRANSCRIPT_CSV = './data/transcript_salesforce_mapping.csv';
const SALESFORCE_CSV = './data/salesforce/Report-2025-11-15-06-23-44.csv';
const OUTPUT_CSV = './data/salesforce_import_ready.csv';
const ARCHIVE_DIR = './data/archive';
const OAUTH_CREDENTIALS_PATH = './oauth_credentials.json';
const TOKEN_PATH = './token.json';
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// Create archive directory if it doesn't exist
if (!fs.existsSync(ARCHIVE_DIR)) {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

console.log('╔═══════════════════════════════════════╗');
console.log('║   📋 SALESFORCE IMPORT CSV BUILDER   ║');
console.log('║   Combining all data into one file   ║');
console.log('╚═══════════════════════════════════════╝\n');

// Helper to convert ID to 15-char format for matching
const to15Char = (id) => id ? id.substring(0, 15) : '';

// Step 1: Load Salesforce data into lookup maps
console.log('📊 Step 1/4: Loading Salesforce Contact/Account data...');
const sfData = fs.readFileSync(SALESFORCE_CSV, 'utf8');
const sfLines = sfData.split('\n').filter(line => line.trim());

const contactMap = new Map(); // 15-char ID -> {name, email, account}
const accountMap = new Map(); // 15-char ID -> {name}

for (let i = 1; i < sfLines.length; i++) {
  const line = sfLines[i];
  const fields = line.split(',');

  const firstName = fields[0]?.trim() || '';
  const lastName = fields[1]?.trim() || '';
  const email = fields[5]?.trim() || '';
  const accountName = fields[3]?.trim() || '';
  const contactId15 = to15Char(fields[7]);
  const accountId15 = to15Char(fields[8]);

  if (contactId15) {
    contactMap.set(contactId15, {
      name: `${firstName} ${lastName}`.trim(),
      email: email,
      account: accountName
    });
  }

  if (accountId15 && accountName) {
    accountMap.set(accountId15, {
      name: accountName
    });
  }
}

console.log(`   ✅ Loaded ${contactMap.size} Contacts`);
console.log(`   ✅ Loaded ${accountMap.size} Accounts\n`);

// Step 2: Authorize Google Drive
console.log('📊 Step 2/4: Connecting to Google Drive...');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function authorizeGoogleDrive() {
  try {
    // Check if service account key is provided (for GitHub Actions)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      console.log('   🔐 Using Service Account authentication...');
      const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountKey,
        scopes: SCOPES,
      });

      const client = await auth.getClient();
      console.log('   ✅ Service Account authenticated');
      return client;
    }

    // Otherwise use OAuth (for local development)
    console.log('   🔐 Using OAuth authentication...');
    const credentials = JSON.parse(fs.readFileSync(OAUTH_CREDENTIALS_PATH, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    if (fs.existsSync(TOKEN_PATH)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      oAuth2Client.setCredentials(token);
      console.log('   ✅ OAuth token loaded');
      return oAuth2Client;
    }

    throw new Error('No token.json found. Please run the main script first to authorize.');
  } catch (error) {
    console.error('   ❌ Google Drive authorization failed:', error.message);
    console.log('   ⚠️  Will continue without Google Drive URLs\n');
    return null;
  }
}

async function fetchGoogleDriveFileMap(authClient) {
  if (!authClient || !GOOGLE_DRIVE_FOLDER_ID) {
    return new Map();
  }

  try {
    const drive = google.drive({ version: 'v3', auth: authClient });
    let allFiles = [];
    let pageToken = null;

    do {
      const response = await drive.files.list({
        q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false`,
        fields: 'nextPageToken, files(id, name, webViewLink)',
        pageSize: 1000,
        pageToken: pageToken
      });

      allFiles = allFiles.concat(response.data.files);
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    // Create filename -> URL map
    const fileMap = new Map();
    allFiles.forEach(file => {
      fileMap.set(file.name, file.webViewLink);
    });

    return fileMap;
  } catch (error) {
    console.error('   ❌ Error fetching Google Drive files:', error.message);
    return new Map();
  }
}

const authClient = await authorizeGoogleDrive();
console.log('   ✅ Google Drive authorized\n');

console.log('📊 Step 3/4: Fetching Google Drive file URLs...');
const driveFileMap = await fetchGoogleDriveFileMap(authClient);
console.log(`   ✅ Found ${driveFileMap.size} files in Google Drive\n`);

// Step 3: Read transcript data and combine
console.log('📊 Step 4/4: Building combined CSV...');

const transcriptData = fs.readFileSync(TRANSCRIPT_CSV, 'utf8');
const transcriptLines = transcriptData.split('\n').filter(line => line.trim());

// CSV Headers
const headers = [
  'ConversationID',
  'Filename',
  'PersonID',
  'PersonCrmID',
  'ContactName',
  'ContactEmail',
  'ContactMatchStatus',
  'AccountID',
  'AccountCrmID',
  'AccountName',
  'AccountMatchStatus',
  'MediaType',
  'Platform',
  'Date',
  'Duration',
  'GoogleDriveURL'
];

const outputLines = [headers.join(',')];

let matchedContacts = 0;
let matchedAccounts = 0;
let foundUrls = 0;

for (let i = 1; i < transcriptLines.length; i++) {
  const line = transcriptLines[i];
  const fields = line.split(',');

  const conversationId = fields[0]?.trim() || '';
  const filename = fields[1]?.trim() || '';
  const personId = fields[2]?.trim() || '';
  const personCrmId = fields[3]?.trim() || '';
  const accountId = fields[4]?.trim() || '';
  const accountCrmId = fields[5]?.trim() || '';
  const mediaType = fields[6]?.trim() || '';
  const platform = fields[7]?.trim() || '';
  const date = fields[8]?.trim() || '';
  const duration = fields[9]?.trim() || '';

  // Look up Contact
  const contactId15 = to15Char(personCrmId);
  const contact = contactMap.get(contactId15);
  const contactName = contact?.name || '';
  const contactEmail = contact?.email || '';
  const contactStatus = contact ? '✅ Matched' : '❌ Not Found';
  if (contact) matchedContacts++;

  // Look up Account
  const accountId15 = to15Char(accountCrmId);
  const account = accountMap.get(accountId15);
  const accountName = account?.name || '';
  const accountStatus = account ? '✅ Matched' : '❌ Not Found';
  if (account) matchedAccounts++;

  // Look up Google Drive URL
  const driveUrl = driveFileMap.get(filename) || '';
  if (driveUrl) foundUrls++;

  // Build output row
  const outputRow = [
    conversationId,
    filename,
    personId,
    personCrmId,
    contactName,
    contactEmail,
    contactStatus,
    accountId,
    accountCrmId,
    accountName,
    accountStatus,
    mediaType,
    platform,
    date,
    duration,
    driveUrl
  ];

  outputLines.push(outputRow.join(','));
}

// Generate timestamp for archive file
const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5); // 2025-11-15T14-30-45
const timestampedFilename = `salesforce_import_${timestamp}.csv`;
const archiveFilePath = `${ARCHIVE_DIR}/${timestampedFilename}`;

// Write main output file (always latest)
fs.writeFileSync(OUTPUT_CSV, outputLines.join('\n'), 'utf8');

// Write timestamped archive copy
fs.writeFileSync(archiveFilePath, outputLines.join('\n'), 'utf8');

// Create metadata file
const metadata = {
  generatedAt: now.toISOString(),
  totalRecords: transcriptLines.length - 1,
  contactMatches: matchedContacts,
  accountMatches: matchedAccounts,
  googleDriveUrls: foundUrls,
  archiveFile: timestampedFilename
};
fs.writeFileSync('./data/last_generation.json', JSON.stringify(metadata, null, 2), 'utf8');

console.log('   ✅ Combined CSV created!\n');

// Summary
console.log('═'.repeat(60));
console.log('📊 SUMMARY:\n');
console.log(`Generated at: ${now.toLocaleString()}`);
console.log(`Total Records: ${transcriptLines.length - 1}`);
console.log(`Contact Matches: ${matchedContacts} (${((matchedContacts / (transcriptLines.length - 1)) * 100).toFixed(1)}%)`);
console.log(`Account Matches: ${matchedAccounts} (${((matchedAccounts / (transcriptLines.length - 1)) * 100).toFixed(1)}%)`);
console.log(`Google Drive URLs: ${foundUrls} (${((foundUrls / (transcriptLines.length - 1)) * 100).toFixed(1)}%)`);
console.log('');
console.log(`✅ Main file (latest): ${OUTPUT_CSV}`);
console.log(`📦 Archived copy: ${archiveFilePath}`);
console.log(`📄 Metadata: ./data/last_generation.json`);
console.log('═'.repeat(60));

console.log('\n📋 NEXT STEPS:\n');
console.log('1. Open the file in Excel to review:');
console.log(`   ${OUTPUT_CSV}\n`);
console.log('2. Verify the data looks correct:');
console.log('   - Check ContactName and AccountName columns');
console.log('   - Verify GoogleDriveURL links work');
console.log('   - Look for any unexpected matches\n');
console.log('3. When ready, import to Salesforce:');
console.log('   - Use Salesforce Data Import Wizard or Data Loader');
console.log('   - Follow: docs/SALESFORCE_TEST_IMPORT_GUIDE.md\n');
console.log('4. Import just the matched records first (optional):');
console.log('   - Filter to rows with "✅ Matched" status');
console.log('   - Save as separate file for test import\n');

console.log('💡 TIP: You can also run "npm run create-test-import"');
console.log('   to create a 5-record test subset from this file.\n');
