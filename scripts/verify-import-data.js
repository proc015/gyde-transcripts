#!/usr/bin/env node

/**
 * VERIFY IMPORT DATA QUALITY
 *
 * Checks the salesforce_import_ready.csv for:
 * - Total records
 * - How many have Salesforce Contact matches
 * - How many have Salesforce Account matches
 * - Duplicate ConversationIDs
 * - Duplicate Filenames
 */

import fs from 'fs';

const CSV_FILE = './data/salesforce_import_ready.csv';

console.log('╔═══════════════════════════════════════╗');
console.log('║   🔍 DATA QUALITY VERIFICATION       ║');
console.log('╚═══════════════════════════════════════╝\n');

try {
  const csvData = fs.readFileSync(CSV_FILE, 'utf8');
  const lines = csvData.split('\n').filter(line => line.trim());

  // Parse CSV
  const headers = lines[0].split(',');
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].split(',');
    records.push({
      conversationId: fields[0]?.trim() || '',
      filename: fields[1]?.trim() || '',
      personId: fields[2]?.trim() || '',
      personCrmId: fields[3]?.trim() || '',
      contactName: fields[4]?.trim() || '',
      contactEmail: fields[5]?.trim() || '',
      contactMatchStatus: fields[6]?.trim() || '',
      accountId: fields[7]?.trim() || '',
      accountCrmId: fields[8]?.trim() || '',
      accountName: fields[9]?.trim() || '',
      accountMatchStatus: fields[10]?.trim() || '',
      mediaType: fields[11]?.trim() || '',
      platform: fields[12]?.trim() || '',
      date: fields[13]?.trim() || '',
      duration: fields[14]?.trim() || '',
      googleDriveUrl: fields[15]?.trim() || ''
    });
  }

  console.log('📊 TOTAL RECORDS:', records.length, '\n');

  // Count matches
  const contactMatches = records.filter(r => r.contactMatchStatus === '✅ Matched');
  const accountMatches = records.filter(r => r.accountMatchStatus === '✅ Matched');
  const googleDriveUrls = records.filter(r => r.googleDriveUrl && r.googleDriveUrl.startsWith('http'));

  console.log('═'.repeat(60));
  console.log('📋 SALESFORCE ID MATCHES:\n');
  console.log(`Contact/Lead Matches:  ${contactMatches.length} / ${records.length} (${((contactMatches.length / records.length) * 100).toFixed(1)}%)`);
  console.log(`Account Matches:       ${accountMatches.length} / ${records.length} (${((accountMatches.length / records.length) * 100).toFixed(1)}%)`);
  console.log(`Google Drive URLs:     ${googleDriveUrls.length} / ${records.length} (${((googleDriveUrls.length / records.length) * 100).toFixed(1)}%)`);
  console.log('');

  // Records with NO matches at all
  const noMatches = records.filter(r =>
    r.contactMatchStatus !== '✅ Matched' &&
    r.accountMatchStatus !== '✅ Matched'
  );
  console.log(`Records with ZERO Salesforce matches: ${noMatches.length}`);
  console.log('');

  // Check for duplicates
  console.log('═'.repeat(60));
  console.log('🔍 DUPLICATE CHECK:\n');

  const conversationIds = records.map(r => r.conversationId);
  const uniqueConversationIds = new Set(conversationIds);
  const duplicateConversationIds = conversationIds.filter((id, index) =>
    conversationIds.indexOf(id) !== index
  );

  if (duplicateConversationIds.length > 0) {
    console.log(`❌ DUPLICATE ConversationIDs found: ${duplicateConversationIds.length}`);
    console.log('   Duplicates:', [...new Set(duplicateConversationIds)]);
  } else {
    console.log('✅ NO duplicate ConversationIDs');
  }

  const filenames = records.map(r => r.filename);
  const uniqueFilenames = new Set(filenames);
  const duplicateFilenames = filenames.filter((name, index) =>
    filenames.indexOf(name) !== index
  );

  if (duplicateFilenames.length > 0) {
    console.log(`❌ DUPLICATE Filenames found: ${duplicateFilenames.length}`);
    console.log('   Duplicates:', [...new Set(duplicateFilenames)]);
  } else {
    console.log('✅ NO duplicate Filenames');
  }
  console.log('');

  // Breakdown by platform
  console.log('═'.repeat(60));
  console.log('📊 BREAKDOWN BY SOURCE:\n');

  const audioSalesloft = records.filter(r => r.mediaType === 'audio' && r.platform === 'salesloft');
  const videoZoom = records.filter(r => r.mediaType === 'video' && r.platform === 'zoom');

  console.log(`Audio (SalesLoft):     ${audioSalesloft.length}`);
  console.log(`Video (Zoom):          ${videoZoom.length}`);
  console.log('');

  // Records that will import cleanly (have at least one match)
  const cleanImports = records.filter(r =>
    r.contactMatchStatus === '✅ Matched' ||
    r.accountMatchStatus === '✅ Matched'
  );

  console.log('═'.repeat(60));
  console.log('📈 IMPORT SUMMARY:\n');
  console.log(`Records with at least 1 Salesforce link: ${cleanImports.length} (${((cleanImports.length / records.length) * 100).toFixed(1)}%)`);
  console.log(`Records with NO Salesforce links:        ${noMatches.length} (${((noMatches.length / records.length) * 100).toFixed(1)}%)`);
  console.log('');

  // Show some examples of records with no matches
  if (noMatches.length > 0) {
    console.log('═'.repeat(60));
    console.log('⚠️  RECORDS WITH NO SALESFORCE MATCHES (showing first 10):\n');
    noMatches.slice(0, 10).forEach((r, i) => {
      console.log(`${i + 1}. ${r.filename}`);
      console.log(`   ConversationID: ${r.conversationId}`);
      console.log(`   PersonCrmID: ${r.personCrmId || 'N/A'}`);
      console.log(`   AccountCrmID: ${r.accountCrmId || 'N/A'}`);
      console.log(`   Google Drive: ${r.googleDriveUrl ? '✅ Yes' : '❌ No'}`);
      console.log('');
    });

    console.log('💡 These records will still import, but won\'t be linked to Contacts/Accounts.');
    console.log('   You can update the links manually later if needed.\n');
  }

  console.log('═'.repeat(60));
  console.log('\n✅ DATA QUALITY CHECK COMPLETE\n');

  // Final recommendation
  if (duplicateConversationIds.length > 0 || duplicateFilenames.length > 0) {
    console.log('⚠️  RECOMMENDATION: FIX DUPLICATES BEFORE IMPORTING');
    console.log('   Run: npm run create-import-csv (to regenerate clean data)\n');
  } else if (cleanImports.length / records.length >= 0.6) {
    console.log('🎉 RECOMMENDATION: READY TO IMPORT!');
    console.log(`   ${((cleanImports.length / records.length) * 100).toFixed(0)}% of records have Salesforce links.`);
    console.log('   This is a good match rate.\n');
  } else {
    console.log('⚠️  RECOMMENDATION: Review unmatched records');
    console.log(`   Only ${((cleanImports.length / records.length) * 100).toFixed(0)}% have Salesforce links.`);
    console.log('   Consider importing matched records first to test.\n');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
