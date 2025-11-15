#!/usr/bin/env node

/**
 * Main Entry Point
 *
 * This file serves as the entry point for the application.
 * It delegates to the actual main logic in src/main.js
 */

import { main } from './src/main.js';

// Run directly if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
