#!/usr/bin/env node

/**
 * TEST MODE
 *
 * Quick test to fetch a limited number of transcripts.
 * Use this for:
 * - Testing the setup
 * - Verifying API credentials
 * - Checking recent calls
 * - Spot-checking transcript quality
 *
 * Run with: npm test
 */

import { main } from '../src/main.js';
import { getConfig } from '../config/config.js';

console.log('╔═══════════════════════════════════════╗');
console.log('║       🧪 TEST MODE - SALESLOFT        ║');
console.log('║   Fetching limited transcripts...     ║');
console.log('╚═══════════════════════════════════════╝');

const config = getConfig('test');

main(config).catch(error => {
  console.error('Test run failed:', error);
  process.exit(1);
});
