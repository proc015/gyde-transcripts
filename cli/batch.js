#!/usr/bin/env node

/**
 * BATCH MODE
 *
 * Process all available call transcripts with AI-generated text.
 * Use this for:
 * - Production data extraction
 * - Full historical backfill
 * - Ongoing scheduled syncs
 * - Getting ALL transcripts
 *
 * Features:
 * - Automatically skips already-processed calls
 * - Saves progress every 10 calls
 * - Safe to run multiple times (adds only net-new)
 * - No limit on number of transcripts
 *
 * Run with: npm run batch
 *
 * To process all your calls:
 * 1. Run this script: npm run batch
 * 2. Wait for completion
 * 3. Run again: npm run batch
 * 4. Repeat until you see "Found 0 new transcripts"
 */

import { main } from '../src/main.js';
import { getConfig } from '../config/config.js';

console.log('╔═══════════════════════════════════════╗');
console.log('║    📦 BATCH MODE - SALESLOFT          ║');
console.log('║  Processing all available calls...    ║');
console.log('║  (Auto-skips duplicates)              ║');
console.log('╚═══════════════════════════════════════╝');

const config = getConfig('batch');

main(config).catch(error => {
  console.error('Batch run failed:', error);
  process.exit(1);
});
