#!/usr/bin/env node

/**
 * VERIFY MODE
 *
 * Checks downloaded transcripts for duplicates
 * Use this to verify the fix is working before running full batch
 *
 * Run with: npm run verify
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const RECORDINGS_FOLDER = './recordings';

console.log('╔═══════════════════════════════════════╗');
console.log('║    🔍 VERIFY MODE                     ║');
console.log('║  Checking for duplicate transcripts   ║');
console.log('╚═══════════════════════════════════════╝\n');

try {
  // Get all transcript files
  const files = fs.readdirSync(RECORDINGS_FOLDER).filter(f => f.endsWith('.txt'));

  if (files.length === 0) {
    console.log('❌ No transcript files found in ./recordings/');
    console.log('   Run `npm test` first to download some transcripts\n');
    process.exit(1);
  }

  console.log(`📊 Found ${files.length} transcript files\n`);

  // Extract transcript content and compute hashes
  const transcripts = new Map(); // hash -> { files: [], callIds: [], content: preview }
  const callIds = new Set();
  const transcriptionIds = new Set();

  for (const file of files) {
    const filePath = path.join(RECORDINGS_FOLDER, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract call ID from filename
    const match = file.match(/transcript_call_(\d+)_/);
    const callId = match ? match[1] : 'unknown';
    callIds.add(callId);

    // Extract transcription ID from content
    const transcriptionMatch = content.match(/Transcription ID: ([a-f0-9-]+)/);
    if (transcriptionMatch) {
      transcriptionIds.add(transcriptionMatch[1]);
    }

    // Extract just the transcript text (after "=== TRANSCRIPT ===")
    const transcriptStart = content.indexOf('=== TRANSCRIPT ===');
    if (transcriptStart === -1) continue;

    const transcriptText = content.substring(transcriptStart + 20).trim();

    // Compute hash of transcript content
    const hash = crypto.createHash('md5').update(transcriptText).digest('hex');

    if (!transcripts.has(hash)) {
      transcripts.set(hash, {
        files: [],
        callIds: [],
        content: transcriptText.substring(0, 100) + '...'
      });
    }

    transcripts.get(hash).files.push(file);
    transcripts.get(hash).callIds.push(callId);
  }

  // Analyze results
  const uniqueTranscripts = transcripts.size;
  const duplicateGroups = Array.from(transcripts.values()).filter(t => t.files.length > 1);

  console.log('=== ANALYSIS RESULTS ===\n');
  console.log(`📁 Total files: ${files.length}`);
  console.log(`🔢 Unique call IDs: ${callIds.size}`);
  console.log(`📝 Unique transcription IDs: ${transcriptionIds.size}`);
  console.log(`✅ Unique transcript content: ${uniqueTranscripts}`);
  console.log(`❌ Duplicate groups: ${duplicateGroups.length}\n`);

  if (duplicateGroups.length === 0) {
    console.log('🎉 SUCCESS! All transcripts are unique!\n');
    console.log('✓ No duplicate content found');
    console.log('✓ Each call has its own unique transcript');
    console.log('✓ Safe to run `npm run batch` for full dataset\n');
  } else {
    console.log('⚠️  WARNING: Found duplicate transcripts!\n');

    duplicateGroups.forEach((group, index) => {
      console.log(`\nDuplicate Group ${index + 1}:`);
      console.log(`  Files (${group.files.length}):`);
      group.files.forEach(f => console.log(`    - ${f}`));
      console.log(`  Call IDs: ${group.callIds.join(', ')}`);
      console.log(`  Content preview: ${group.content}`);
    });

    console.log('\n❌ PROBLEM DETECTED: The bug is not fully fixed yet');
    console.log('   Do NOT run batch mode until this is resolved\n');
  }

  // Additional stats
  console.log('=== DETAILED STATS ===\n');
  console.log(`Shortest transcript: ${Math.min(...Array.from(transcripts.values()).map(t => t.content.length))} chars`);
  console.log(`Longest transcript: ${Math.max(...Array.from(transcripts.values()).map(t => t.content.length))} chars`);

  // List first 5 call IDs
  const callIdList = Array.from(callIds).slice(0, 5);
  console.log(`\nSample call IDs: ${callIdList.join(', ')}${callIds.size > 5 ? '...' : ''}`);

} catch (error) {
  console.error('❌ Error during verification:', error.message);
  process.exit(1);
}
