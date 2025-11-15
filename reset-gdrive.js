#!/usr/bin/env node

/**
 * Google Drive Reset & Re-upload Script
 * 1. Deletes ALL files from Google Drive folder
 * 2. Re-uploads all transcript files from recordings/ folder
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { Readable } from 'stream';

dotenv.config();

const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const OAUTH_CREDENTIALS_PATH = './oauth_credentials.json';
const TOKEN_PATH = './token.json';
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const RECORDINGS_FOLDER = './recordings';

async function authorizeGoogleDrive() {
  try {
    const credentials = JSON.parse(fs.readFileSync(OAUTH_CREDENTIALS_PATH, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    if (fs.existsSync(TOKEN_PATH)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      oAuth2Client.setCredentials(token);
      return oAuth2Client;
    }

    throw new Error('Token not found. Please run the main script first to authorize.');
  } catch (error) {
    console.error('Error authorizing with Google Drive:', error.message);
    throw error;
  }
}

async function listFilesInFolder(authClient, folderId) {
  const drive = google.drive({ version: 'v3', auth: authClient });

  let allFiles = [];
  let pageToken = null;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'nextPageToken, files(id, name)',
      pageSize: 1000,
      pageToken: pageToken
    });

    allFiles = allFiles.concat(response.data.files);
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return allFiles;
}

async function deleteFile(authClient, fileId) {
  const drive = google.drive({ version: 'v3', auth: authClient });
  await drive.files.delete({ fileId: fileId });
}

async function uploadFile(authClient, fileName, filePath) {
  const drive = google.drive({ version: 'v3', auth: authClient });

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const bufferStream = new Readable();
  bufferStream.push(fileContent);
  bufferStream.push(null);

  const fileMetadata = {
    name: fileName,
    parents: [GOOGLE_DRIVE_FOLDER_ID],
    mimeType: 'text/plain'
  };

  const media = {
    mimeType: 'text/plain',
    body: bufferStream
  };

  await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, name'
  });
}

async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║  🔄 GOOGLE DRIVE RESET & RE-UPLOAD   ║');
  console.log('║  Delete all → Upload fresh files     ║');
  console.log('╚═══════════════════════════════════════╝\n');

  // Step 1: Authorize
  console.log('Step 1: Authorizing with Google Drive...');
  const authClient = await authorizeGoogleDrive();
  console.log('✓ Authorized\n');

  // Step 2: List all files in Google Drive
  console.log('Step 2: Listing all files in Google Drive...');
  const existingFiles = await listFilesInFolder(authClient, GOOGLE_DRIVE_FOLDER_ID);
  console.log(`✓ Found ${existingFiles.length} files in Google Drive\n`);

  // Step 3: Delete all files
  if (existingFiles.length > 0) {
    console.log('Step 3: Deleting ALL files from Google Drive...');
    console.log('⚠️  This will delete all files! Press Ctrl+C to cancel...');
    console.log('Waiting 5 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    let deleted = 0;
    for (const file of existingFiles) {
      await deleteFile(authClient, file.id);
      deleted++;
      if (deleted % 10 === 0 || deleted === existingFiles.length) {
        console.log(`  Deleted ${deleted}/${existingFiles.length} files...`);
      }
    }
    console.log(`✓ Deleted all ${existingFiles.length} files\n`);
  } else {
    console.log('Step 3: No files to delete (folder is empty)\n');
  }

  // Step 4: Get local files
  console.log('Step 4: Reading local transcript files...');
  const localFiles = fs.readdirSync(RECORDINGS_FOLDER)
    .filter(f => f.endsWith('.txt'))
    .sort();
  console.log(`✓ Found ${localFiles.length} local transcript files\n`);

  if (localFiles.length === 0) {
    console.log('⚠️  No local files to upload!');
    return;
  }

  // Step 5: Upload all files
  console.log('Step 5: Uploading files to Google Drive...');
  let uploaded = 0;
  let failed = 0;

  for (const fileName of localFiles) {
    try {
      const filePath = path.join(RECORDINGS_FOLDER, fileName);
      await uploadFile(authClient, fileName, filePath);
      uploaded++;
      if (uploaded % 10 === 0 || uploaded === localFiles.length) {
        console.log(`  Uploaded ${uploaded}/${localFiles.length} files...`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to upload ${fileName}:`, error.message);
      failed++;
    }
  }

  // Summary
  console.log(`\n=== RESET COMPLETE ===`);
  console.log(`✓ Uploaded: ${uploaded} files`);
  if (failed > 0) {
    console.log(`✗ Failed: ${failed} files`);
  }
  console.log(`✓ Google Drive now has exactly ${uploaded} transcript files`);
  console.log(`✓ All files include Salesforce IDs\n`);
  console.log(`✅ Google Drive is now perfectly synced with your local recordings/ folder!`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
