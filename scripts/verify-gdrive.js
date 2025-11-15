#!/usr/bin/env node

/**
 * Verify Google Drive Upload
 * Downloads a random file from Google Drive and checks if it has Salesforce IDs
 */

import dotenv from 'dotenv';
import fs from 'fs';
import { google } from 'googleapis';

dotenv.config();

const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const OAUTH_CREDENTIALS_PATH = './oauth_credentials.json';
const TOKEN_PATH = './token.json';

async function authorizeGoogleDrive() {
  const credentials = JSON.parse(fs.readFileSync(OAUTH_CREDENTIALS_PATH, 'utf8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  throw new Error('Token not found');
}

async function listFiles(authClient) {
  const drive = google.drive({ version: 'v3', auth: authClient });

  const response = await drive.files.list({
    q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false`,
    fields: 'files(id, name)',
    pageSize: 10
  });

  return response.data.files;
}

async function downloadFile(authClient, fileId) {
  const drive = google.drive({ version: 'v3', auth: authClient });

  const response = await drive.files.get(
    { fileId: fileId, alt: 'media' },
    { responseType: 'text' }
  );

  return response.data;
}

async function main() {
  console.log('🔍 Verifying Google Drive Upload...\n');

  const authClient = await authorizeGoogleDrive();
  console.log('✓ Authorized\n');

  const files = await listFiles(authClient);
  console.log(`✓ Found ${files.length} files in Google Drive\n`);

  if (files.length === 0) {
    console.log('⚠️  No files found in Google Drive!');
    return;
  }

  // Pick first 3 files to verify
  const filesToCheck = files.slice(0, 3);

  console.log('Checking first 3 files for Salesforce IDs:\n');

  for (const file of filesToCheck) {
    console.log(`📄 ${file.name}`);
    const content = await downloadFile(authClient, file.id);

    // Check for Salesforce IDs in the content
    const lines = content.split('\n').slice(0, 15);
    const hasSalesforceContact = lines.some(line => line.includes('Salesforce Contact/Lead ID'));
    const hasSalesforceAccount = lines.some(line => line.includes('Salesforce Account ID'));

    if (hasSalesforceContact && hasSalesforceAccount) {
      console.log('  ✅ HAS Salesforce IDs');
      const contactLine = lines.find(line => line.includes('Salesforce Contact/Lead ID'));
      const accountLine = lines.find(line => line.includes('Salesforce Account ID'));
      console.log(`  ${contactLine.trim()}`);
      console.log(`  ${accountLine.trim()}`);
    } else if (!hasSalesforceContact && !hasSalesforceAccount) {
      console.log('  ⚠️  NO Salesforce IDs (conversation without Person/Account)');
    } else {
      console.log('  ❌ MISSING Salesforce IDs!');
      console.log('\nFirst 12 lines:');
      lines.slice(0, 12).forEach((line, i) => console.log(`  ${i + 1}: ${line}`));
    }
    console.log('');
  }

  console.log('✅ Verification complete!');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
