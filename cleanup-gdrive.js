#!/usr/bin/env node

/**
 * Google Drive Cleanup Script
 * Deletes old transcript files (before Nov 15, 2025) from Google Drive
 * Keeps only the new files with Salesforce IDs
 */

import dotenv from 'dotenv';
import fs from 'fs';
import { google } from 'googleapis';

dotenv.config();

const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const OAUTH_CREDENTIALS_PATH = './oauth_credentials.json';
const TOKEN_PATH = './token.json';
const SCOPES = ['https://www.googleapis.com/auth/drive'];

// Cutoff date - delete files uploaded before this (keep today's uploads)
const CUTOFF_DATE = new Date('2025-11-15T00:00:00Z');

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
      fields: 'nextPageToken, files(id, name, createdTime, modifiedTime)',
      pageSize: 1000,
      pageToken: pageToken
    });

    allFiles = allFiles.concat(response.data.files);
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return allFiles;
}

async function deleteFile(authClient, fileId, fileName) {
  const drive = google.drive({ version: 'v3', auth: authClient });

  try {
    await drive.files.delete({ fileId: fileId });
    console.log(`  ✓ Deleted: ${fileName}`);
    return true;
  } catch (error) {
    console.error(`  ✗ Failed to delete ${fileName}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║   🧹 GOOGLE DRIVE CLEANUP SCRIPT     ║');
  console.log('║   Removing old transcript files...    ║');
  console.log('╚═══════════════════════════════════════╝\n');

  // Authorize
  console.log('Authorizing with Google Drive...');
  const authClient = await authorizeGoogleDrive();
  console.log('✓ Authorized\n');

  // List all files
  console.log(`Listing files in folder: ${GOOGLE_DRIVE_FOLDER_ID}...`);
  const files = await listFilesInFolder(authClient, GOOGLE_DRIVE_FOLDER_ID);
  console.log(`✓ Found ${files.length} total files\n`);

  if (files.length === 0) {
    console.log('No files to delete.');
    return;
  }

  // Filter files to delete (uploaded before cutoff date)
  const filesToDelete = files.filter(file => {
    const uploadDate = new Date(file.createdTime);
    return uploadDate < CUTOFF_DATE;
  });

  const filesToKeep = files.length - filesToDelete.length;

  console.log(`Files to delete (uploaded before ${CUTOFF_DATE.toISOString()}): ${filesToDelete.length}`);
  console.log(`Files to keep (uploaded today): ${filesToKeep}\n`);

  if (filesToDelete.length === 0) {
    console.log('✓ No old files to delete. All files are recent.');
    return;
  }

  // Confirm deletion
  console.log('⚠️  WARNING: This will permanently delete files from Google Drive!');
  console.log(`\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n`);

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Delete files
  console.log('Deleting old files...\n');
  let successCount = 0;
  let failCount = 0;

  for (const file of filesToDelete) {
    const success = await deleteFile(authClient, file.id, file.name);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  // Summary
  console.log(`\n=== CLEANUP SUMMARY ===`);
  console.log(`✓ Deleted: ${successCount} files`);
  if (failCount > 0) {
    console.log(`✗ Failed: ${failCount} files`);
  }
  console.log(`✓ Remaining: ${filesToKeep} files (new files with Salesforce IDs)`);
  console.log(`\n✅ Cleanup complete!`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
