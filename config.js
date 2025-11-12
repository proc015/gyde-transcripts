// Shared configuration for both test and batch modes

export const CONFIGS = {
  // Test mode: Get a limited number of transcripts for testing
  test: {
    MODE: 'limited',
    TARGET_AI_TRANSCRIPTS: 10,  // Get 10 transcripts for testing
    MAX_RECORDS_TO_SCAN: 50,   // Scan 50 records
    MIN_DURATION: 30,
    API_DELAY_MS: 100,
  },

  // Batch mode: Process all available transcripts
  batch: {
    MODE: 'unlimited',
    TARGET_AI_TRANSCRIPTS: null, // Not used in unlimited mode
    MAX_RECORDS_TO_SCAN: 500,
    MIN_DURATION: 30,
    API_DELAY_MS: 100,
  }
};

export function getConfig(mode) {
  return CONFIGS[mode] || CONFIGS.test;
}
