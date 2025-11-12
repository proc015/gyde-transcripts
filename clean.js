#!/usr/bin/env node

/**
 * CLEAN MODE
 *
 * Resets the processed call IDs tracker to start fresh.
 * Use this when:
 * - You fixed a bug and want to re-download transcripts
 * - You want to start over from scratch
 * - You suspect duplicate/incorrect data
 *
 * Run with: npm run clean
 */

import fs from 'fs';
import path from 'path';

const PROCESSED_IDS_FILE = './processed_call_ids.json';
const BACKUP_FOLDER = './backups';

console.log('╔═══════════════════════════════════════╗');
console.log('║    🧹 CLEAN MODE                      ║');
console.log('║  Resetting processed call tracker... ║');
console.log('╚═══════════════════════════════════════╝\n');

try {
  // Create backups folder if it doesn't exist
  if (!fs.existsSync(BACKUP_FOLDER)) {
    fs.mkdirSync(BACKUP_FOLDER, { recursive: true });
    console.log('✓ Created backups folder');
  }

  // Check if processed IDs file exists
  if (fs.existsSync(PROCESSED_IDS_FILE)) {
    // Create backup with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_FOLDER, `processed_call_ids_backup_${timestamp}.json`);

    // Read current file
    const currentData = fs.readFileSync(PROCESSED_IDS_FILE, 'utf8');
    const parsedData = JSON.parse(currentData);

    console.log(`📋 Current tracker has ${parsedData.processedIds?.length || 0} processed calls`);
    console.log(`📄 Current page position: ${parsedData.nextPage || 1}`);

    // Save backup
    fs.writeFileSync(backupFile, currentData, 'utf8');
    console.log(`✓ Backed up to: ${backupFile}`);

    // Delete the original
    fs.unlinkSync(PROCESSED_IDS_FILE);
    console.log('✓ Cleared processed call IDs tracker');
    console.log('✓ Reset pagination to page 1');

    console.log('\n✅ Clean complete! You can now run:');
    console.log('   npm run batch    (to re-download all transcripts)');
    console.log('   npm test         (to download a limited set)');
    console.log('\n💡 Your backup is saved in ./backups/ if you need to restore it');

  } else {
    console.log('ℹ️  No processed IDs file found - nothing to clean');
    console.log('   This is normal if you haven\'t run the script yet');
  }

  // Also clean up debug files
  const debugFiles = ['./debug_conversation.json', './debug_response.json'];
  let debugFilesDeleted = 0;

  for (const debugFile of debugFiles) {
    if (fs.existsSync(debugFile)) {
      fs.unlinkSync(debugFile);
      debugFilesDeleted++;
    }
  }

  if (debugFilesDeleted > 0) {
    console.log(`✓ Cleaned up ${debugFilesDeleted} debug file(s)`);
  }

} catch (error) {
  console.error('❌ Error during cleanup:', error.message);
  process.exit(1);
}
