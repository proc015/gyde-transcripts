#!/usr/bin/env node

/**
 * CREATE TEST SUBSET
 *
 * Creates a small test CSV with 5 records for testing Salesforce import.
 * Adds a GoogleDriveURL column that you'll fill in manually.
 *
 * Run with: node scripts/create-test-subset.js
 */

import fs from 'fs';

const INPUT_CSV = './data/transcript_salesforce_mapping.csv';
const OUTPUT_CSV = './data/test_subset.csv';
const NUM_RECORDS = 5;

console.log('╔═══════════════════════════════════════╗');
console.log('║   📋 CREATE TEST SUBSET               ║');
console.log('║   For Salesforce Import Testing      ║');
console.log('╚═══════════════════════════════════════╝\n');

try {
  // Read the full CSV
  const csvContent = fs.readFileSync(INPUT_CSV, 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    console.error('❌ CSV file is empty or has no data rows');
    process.exit(1);
  }

  const header = lines[0];
  const dataLines = lines.slice(1);

  console.log(`📊 Found ${dataLines.length} total records in ${INPUT_CSV}`);
  console.log(`🎯 Extracting first ${NUM_RECORDS} records...\n`);

  // Get first N records
  const testRecords = dataLines.slice(0, NUM_RECORDS);

  // Add GoogleDriveURL column to header
  const newHeader = header + ',GoogleDriveURL';

  // Add empty GoogleDriveURL column to each record
  const newRecords = testRecords.map(record => record + ',');

  // Combine header and records
  const outputLines = [newHeader, ...newRecords];
  const outputContent = outputLines.join('\n');

  // Write to output file
  fs.writeFileSync(OUTPUT_CSV, outputContent, 'utf8');

  console.log(`✅ Created test subset: ${OUTPUT_CSV}`);
  console.log(`✅ Contains ${NUM_RECORDS} records with GoogleDriveURL column\n`);

  console.log('📋 Test Records:');
  console.log('═'.repeat(60));

  // Display the test records nicely
  testRecords.forEach((record, index) => {
    const fields = record.split(',');
    const conversationId = fields[0].substring(0, 8) + '...';
    const filename = fields[1];
    const date = fields[8];

    console.log(`${index + 1}. ${conversationId}`);
    console.log(`   File: ${filename}`);
    console.log(`   Date: ${date}`);
    console.log('');
  });

  console.log('═'.repeat(60));
  console.log('\n📝 NEXT STEPS:\n');
  console.log('1. Open Google Drive folder');
  console.log('   https://drive.google.com/drive/folders/1Xi4wJIa53MnbPbJP57xhZvlGmFkkL6gi\n');
  console.log('2. For each file listed above:');
  console.log('   - Find the file in Google Drive');
  console.log('   - Right-click → Share → Copy link');
  console.log('   - Open data/test_subset.csv');
  console.log('   - Paste the link in the GoogleDriveURL column\n');
  console.log('3. Save the CSV file\n');
  console.log('4. Follow the Salesforce import guide:');
  console.log('   docs/SALESFORCE_TEST_IMPORT_GUIDE.md\n');

} catch (error) {
  console.error('❌ Error creating test subset:', error.message);
  process.exit(1);
}
