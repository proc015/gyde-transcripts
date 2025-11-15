#!/usr/bin/env node

/**
 * WEEKLY AUTOMATION - FULL PIPELINE
 *
 * Runs the complete workflow:
 * 1. Fetch new transcripts from SalesLoft
 * 2. Upload to Google Drive
 * 3. Create Salesforce import CSV with latest data
 *
 * Run with: npm run weekly-update
 *
 * This script is safe to run multiple times - it only processes NEW transcripts
 * (tracks what's already been processed in processed_conversation_ids.json)
 */

import { execSync } from 'child_process';
import fs from 'fs';

const PROCESSED_IDS_FILE = './data/processed_conversation_ids.json';
const OUTPUT_CSV = './data/salesforce_import_ready.csv';

console.log('╔═══════════════════════════════════════════════════╗');
console.log('║   🤖 WEEKLY AUTOMATION - FULL PIPELINE          ║');
console.log('║   Fetch → Process → Upload → Create CSV         ║');
console.log('╚═══════════════════════════════════════════════════╝\n');

const startTime = Date.now();

// Track initial state
let initialProcessedCount = 0;
if (fs.existsSync(PROCESSED_IDS_FILE)) {
  const processedIds = JSON.parse(fs.readFileSync(PROCESSED_IDS_FILE, 'utf8'));
  initialProcessedCount = processedIds.length;
  console.log(`📊 Starting with ${initialProcessedCount} previously processed transcripts\n`);
}

try {
  // STEP 1: Fetch and process new transcripts
  console.log('═'.repeat(60));
  console.log('📥 STEP 1/2: Fetching new transcripts from SalesLoft...\n');

  execSync('node src/main.js', { stdio: 'inherit' });

  console.log('\n✅ Step 1 complete: Transcripts fetched and uploaded to Google Drive\n');

  // Check how many new transcripts were processed
  let newProcessedCount = 0;
  if (fs.existsSync(PROCESSED_IDS_FILE)) {
    const processedIds = JSON.parse(fs.readFileSync(PROCESSED_IDS_FILE, 'utf8'));
    newProcessedCount = processedIds.length;
  }

  const newTranscripts = newProcessedCount - initialProcessedCount;
  console.log(`📊 New transcripts processed: ${newTranscripts}`);
  console.log(`📊 Total transcripts now: ${newProcessedCount}\n`);

  // STEP 2: Create Salesforce import CSV
  console.log('═'.repeat(60));
  console.log('📋 STEP 2/2: Creating Salesforce import CSV...\n');

  execSync('node scripts/create-salesforce-import-csv.js', { stdio: 'inherit' });

  console.log('\n✅ Step 2 complete: Salesforce import CSV updated\n');

  // Summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  console.log('═'.repeat(60));
  console.log('🎉 AUTOMATION COMPLETE!\n');
  console.log(`⏱️  Total time: ${duration} seconds`);
  console.log(`📊 New transcripts: ${newTranscripts}`);
  console.log(`📊 Total transcripts: ${newProcessedCount}`);
  console.log(`📄 Updated file: ${OUTPUT_CSV}\n`);

  if (newTranscripts > 0) {
    console.log('🔔 NEXT STEPS:\n');
    console.log('1. Review the updated CSV:');
    console.log(`   open ${OUTPUT_CSV}\n`);
    console.log('2. Import to Salesforce using Data Import Wizard');
    console.log('   (See: docs/SALESFORCE_SAFE_IMPORT_STEPS.md)\n');
    console.log('💡 TIP: You can import just the new records by filtering');
    console.log('   the CSV to only include recent dates.\n');
  } else {
    console.log('ℹ️  No new transcripts found since last run.\n');
  }

} catch (error) {
  console.error('\n❌ ERROR during automation:');
  console.error(error.message);
  console.error('\nPlease check the error above and try again.\n');
  process.exit(1);
}
