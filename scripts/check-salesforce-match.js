#!/usr/bin/env node

/**
 * CHECK SALESFORCE ID MATCHES
 *
 * Compares Salesforce Contact/Account IDs with the IDs in your transcript CSV
 * to see if there's any overlap.
 *
 * Run with: node scripts/check-salesforce-match.js
 */

import fs from 'fs';

const SALESFORCE_CSV = './data/salesforce/Report-2025-11-15-06-23-44.csv';
const TRANSCRIPT_CSV = './data/transcript_salesforce_mapping.csv';

console.log('╔═══════════════════════════════════════╗');
console.log('║   🔍 SALESFORCE ID MATCH CHECKER     ║');
console.log('╚═══════════════════════════════════════╝\n');

try {
  // Read Salesforce export
  console.log('📊 Reading Salesforce data...');
  const sfData = fs.readFileSync(SALESFORCE_CSV, 'utf8');
  const sfLines = sfData.split('\n').filter(line => line.trim());

  // Parse Salesforce IDs
  const sfContactIds = new Set();
  const sfAccountIds = new Set();

  // Skip header (line 0) and BOM character
  for (let i = 1; i < sfLines.length; i++) {
    const line = sfLines[i];
    const fields = line.split(',');

    // Contact ID is column 7, Account ID is column 8
    const contactId = fields[7]?.trim();
    const accountId = fields[8]?.trim();

    if (contactId) {
      sfContactIds.add(contactId);
      // Also add 18-char version (Salesforce IDs can be 15 or 18 chars)
      // We'll check both formats
    }
    if (accountId) {
      sfAccountIds.add(accountId);
    }
  }

  console.log(`✅ Found ${sfContactIds.size} unique Contacts in Salesforce`);
  console.log(`✅ Found ${sfAccountIds.size} unique Accounts in Salesforce\n`);

  // Show sample IDs
  console.log('📋 Sample Salesforce IDs:');
  console.log('  Contacts:', Array.from(sfContactIds).slice(0, 5).join(', '));
  console.log('  Accounts:', Array.from(sfAccountIds).slice(0, 5).join(', '));
  console.log('');

  // Read transcript CSV
  console.log('📊 Reading transcript data...');
  const transcriptData = fs.readFileSync(TRANSCRIPT_CSV, 'utf8');
  const transcriptLines = transcriptData.split('\n').filter(line => line.trim());

  // Parse transcript IDs
  const transcriptContactIds = new Set();
  const transcriptAccountIds = new Set();

  for (let i = 1; i < transcriptLines.length; i++) {
    const line = transcriptLines[i];
    const fields = line.split(',');

    // PersonCrmID is column 3, AccountCrmID is column 5
    const personCrmId = fields[3]?.trim();
    const accountCrmId = fields[5]?.trim();

    if (personCrmId) transcriptContactIds.add(personCrmId);
    if (accountCrmId) transcriptAccountIds.add(accountCrmId);
  }

  console.log(`✅ Found ${transcriptContactIds.size} unique Contact IDs in transcripts`);
  console.log(`✅ Found ${transcriptAccountIds.size} unique Account IDs in transcripts\n`);

  // Show sample IDs
  console.log('📋 Sample Transcript IDs:');
  console.log('  PersonCrmID:', Array.from(transcriptContactIds).slice(0, 5).join(', '));
  console.log('  AccountCrmID:', Array.from(transcriptAccountIds).slice(0, 5).join(', '));
  console.log('');

  // Find matches (comparing 15-char versions)
  console.log('═'.repeat(60));
  console.log('🔍 CHECKING FOR MATCHES...\n');

  // Helper function to get 15-char version of ID
  const to15Char = (id) => id ? id.substring(0, 15) : '';

  // Convert Salesforce IDs to both formats for comparison
  const sf15ContactIds = new Set(Array.from(sfContactIds).map(to15Char));
  const sf15AccountIds = new Set(Array.from(sfAccountIds).map(to15Char));

  const transcript15ContactIds = new Set(Array.from(transcriptContactIds).map(to15Char));
  const transcript15AccountIds = new Set(Array.from(transcriptAccountIds).map(to15Char));

  // Find matching Contact IDs
  const matchingContacts = [];
  const matchingAccounts = [];

  for (const transcriptId of transcriptContactIds) {
    const id15 = to15Char(transcriptId);
    if (sf15ContactIds.has(id15)) {
      // Find the matching Salesforce contact details
      for (let i = 1; i < sfLines.length; i++) {
        const fields = sfLines[i].split(',');
        const sfId15 = to15Char(fields[7]);
        if (sfId15 === id15) {
          matchingContacts.push({
            transcriptId: transcriptId,
            salesforceId: fields[7],
            name: `${fields[0]} ${fields[1]}`,
            email: fields[5],
            account: fields[3]
          });
          break;
        }
      }
    }
  }

  for (const transcriptId of transcriptAccountIds) {
    const id15 = to15Char(transcriptId);
    if (sf15AccountIds.has(id15)) {
      // Find the matching Salesforce account details
      for (let i = 1; i < sfLines.length; i++) {
        const fields = sfLines[i].split(',');
        const sfId15 = to15Char(fields[8]);
        if (sfId15 === id15) {
          matchingAccounts.push({
            transcriptId: transcriptId,
            salesforceId: fields[8],
            name: fields[3]
          });
          break;
        }
      }
    }
  }

  // Remove duplicates
  const uniqueMatchingAccounts = Array.from(
    new Map(matchingAccounts.map(a => [a.transcriptId, a])).values()
  );

  // Display results
  console.log('📊 MATCH RESULTS:\n');
  console.log(`Contact Matches: ${matchingContacts.length} / ${transcriptContactIds.size}`);
  console.log(`Account Matches: ${uniqueMatchingAccounts.length} / ${transcriptAccountIds.size}\n`);

  if (matchingContacts.length > 0) {
    console.log('✅ MATCHING CONTACTS (showing first 10):\n');
    matchingContacts.slice(0, 10).forEach((match, i) => {
      console.log(`${i + 1}. ${match.name}`);
      console.log(`   Transcript ID: ${match.transcriptId}`);
      console.log(`   Salesforce ID: ${match.salesforceId}`);
      console.log(`   Email: ${match.email || 'N/A'}`);
      console.log(`   Account: ${match.account || 'N/A'}`);
      console.log('');
    });
  } else {
    console.log('❌ NO MATCHING CONTACTS FOUND\n');
  }

  if (uniqueMatchingAccounts.length > 0) {
    console.log('✅ MATCHING ACCOUNTS (showing first 10):\n');
    uniqueMatchingAccounts.slice(0, 10).forEach((match, i) => {
      console.log(`${i + 1}. ${match.name}`);
      console.log(`   Transcript ID: ${match.transcriptId}`);
      console.log(`   Salesforce ID: ${match.salesforceId}`);
      console.log('');
    });
  } else {
    console.log('❌ NO MATCHING ACCOUNTS FOUND\n');
  }

  console.log('═'.repeat(60));
  console.log('\n💡 ANALYSIS:\n');

  if (matchingContacts.length === 0 && uniqueMatchingAccounts.length === 0) {
    console.log('❌ NO MATCHES FOUND - This means:');
    console.log('   1. SalesLoft is connected to a DIFFERENT Salesforce org');
    console.log('   2. OR the sync between SalesLoft and Salesforce is broken');
    console.log('   3. OR these IDs are old/deleted records\n');
    console.log('🔧 NEXT STEPS:');
    console.log('   - Check SalesLoft Settings → Integrations → Salesforce');
    console.log('   - Verify which Salesforce instance it\'s connected to');
    console.log('   - Check if you\'re logged into the correct Salesforce org\n');
  } else {
    const contactPct = ((matchingContacts.length / transcriptContactIds.size) * 100).toFixed(1);
    const accountPct = ((uniqueMatchingAccounts.length / transcriptAccountIds.size) * 100).toFixed(1);

    console.log(`✅ FOUND MATCHES!`);
    console.log(`   - ${contactPct}% of Contact IDs match`);
    console.log(`   - ${accountPct}% of Account IDs match\n`);

    if (contactPct < 50 || accountPct < 50) {
      console.log('⚠️  Match rate is low. This could mean:');
      console.log('   - Some records are deleted or don\'t have permissions');
      console.log('   - Mix of different Salesforce orgs');
      console.log('   - Some IDs are Leads instead of Contacts\n');
    }

    console.log('🎉 GOOD NEWS: You can proceed with Salesforce import!');
    console.log('   - Use the matching IDs to test import first');
    console.log('   - Records without matches will just have blank lookup fields\n');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
