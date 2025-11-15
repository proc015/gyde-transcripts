#!/usr/bin/env node

/**
 * SHOW GENERATION HISTORY
 *
 * Shows when the import CSV was generated and lists all archived versions.
 *
 * Run with: npm run import-history
 */

import fs from 'fs';
import path from 'path';

const ARCHIVE_DIR = './data/archive';
const METADATA_FILE = './data/last_generation.json';
const MAIN_CSV = './data/salesforce_import_ready.csv';

console.log('╔═══════════════════════════════════════╗');
console.log('║   📜 IMPORT CSV GENERATION HISTORY   ║');
console.log('╚═══════════════════════════════════════╝\n');

// Show current/latest version
if (fs.existsSync(METADATA_FILE)) {
  const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
  const generatedDate = new Date(metadata.generatedAt);

  console.log('📊 CURRENT VERSION (Latest):\n');
  console.log(`File: ${MAIN_CSV}`);
  console.log(`Generated: ${generatedDate.toLocaleString()}`);
  console.log(`Total Records: ${metadata.totalRecords}`);
  console.log(`Contact Matches: ${metadata.contactMatches} (${((metadata.contactMatches / metadata.totalRecords) * 100).toFixed(1)}%)`);
  console.log(`Account Matches: ${metadata.accountMatches} (${((metadata.accountMatches / metadata.totalRecords) * 100).toFixed(1)}%)`);
  console.log(`Google Drive URLs: ${metadata.googleDriveUrls} (${((metadata.googleDriveUrls / metadata.totalRecords) * 100).toFixed(1)}%)`);
  console.log('');
} else {
  console.log('⚠️  No metadata file found. Run: npm run create-import-csv\n');
}

// Show archived versions
if (fs.existsSync(ARCHIVE_DIR)) {
  const files = fs.readdirSync(ARCHIVE_DIR)
    .filter(f => f.startsWith('salesforce_import_') && f.endsWith('.csv'))
    .map(f => {
      const stats = fs.statSync(path.join(ARCHIVE_DIR, f));
      // Parse timestamp from filename: salesforce_import_2025-11-15T15-58-45.csv
      const timestampMatch = f.match(/salesforce_import_(.+)\.csv/);
      const timestamp = timestampMatch ? timestampMatch[1].replace(/T/, ' ').replace(/-/g, ':') : '';

      return {
        name: f,
        size: stats.size,
        modified: stats.mtime,
        timestamp: timestamp
      };
    })
    .sort((a, b) => b.modified - a.modified); // Most recent first

  if (files.length > 0) {
    console.log('═'.repeat(60));
    console.log('📦 ARCHIVED VERSIONS:\n');

    files.forEach((file, i) => {
      const sizeKB = (file.size / 1024).toFixed(1);
      console.log(`${i + 1}. ${file.name}`);
      console.log(`   Generated: ${file.modified.toLocaleString()}`);
      console.log(`   Size: ${sizeKB} KB`);
      console.log('');
    });

    console.log(`Total archived versions: ${files.length}`);
    console.log('');
  } else {
    console.log('📦 No archived versions yet.\n');
  }
} else {
  console.log('📦 No archive directory found.\n');
}

console.log('═'.repeat(60));
console.log('\n💡 TIP: Archive folder keeps historical versions so you can:');
console.log('   - Compare what changed between runs');
console.log('   - Rollback to a previous version if needed');
console.log('   - Track when new transcripts were added\n');
