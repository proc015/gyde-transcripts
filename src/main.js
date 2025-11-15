import dotenv from 'dotenv';
import path from 'path';
import { SalesloftClient } from './api/salesloft-client.js';
import { GoogleDriveService } from './services/google-drive-service.js';
import { FileService } from './services/file-service.js';
import { TranscriptService } from './services/transcript-service.js';
import {
  DOWNLOAD_FOLDER,
  PROCESSED_IDS_FILE,
  LEGACY_PROCESSED_IDS_FILE,
  MAPPING_CSV_FILE,
  OAUTH_CREDENTIALS_PATH,
  TOKEN_PATH
} from './utils/constants.js';

dotenv.config();

const SALESLOFT_API_KEY = process.env.SALESLOFT_API_KEY;
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

/**
 * Main function to orchestrate the transcript processing
 */
export async function main(config = null) {
  try {
    // Use provided config or default to test mode
    if (!config) {
      console.log('⚠️  No config provided, using test mode defaults');
      config = {
        MODE: 'limited',
        TARGET_AI_TRANSCRIPTS: 15,
        MAX_RECORDS_TO_SCAN: 100,
        MIN_DURATION: 30,
        API_DELAY_MS: 100,
      };
    }

    const { MODE, TARGET_AI_TRANSCRIPTS, MAX_RECORDS_TO_SCAN, MIN_DURATION, API_DELAY_MS } = config;

    // Initialize services
    const salesloftClient = new SalesloftClient(SALESLOFT_API_KEY);
    const fileService = new FileService(
      PROCESSED_IDS_FILE,
      LEGACY_PROCESSED_IDS_FILE,
      MAPPING_CSV_FILE,
      DOWNLOAD_FOLDER
    );
    const googleDriveService = new GoogleDriveService(OAUTH_CREDENTIALS_PATH, TOKEN_PATH);
    const transcriptService = new TranscriptService(salesloftClient, fileService, googleDriveService);

    // Load previously processed conversation IDs and pagination state
    const { processedIds, nextPage } = fileService.loadProcessedIds();
    console.log(`\n📋 Previously processed: ${processedIds.size} conversations`);
    console.log(`📄 Resuming from page: ${nextPage}`);

    if (MODE === 'limited') {
      console.log(`🎯 MODE: Limited - Target ${TARGET_AI_TRANSCRIPTS} new AI transcripts\n`);
    } else {
      console.log(`🎯 MODE: Unlimited - Process all available conversations (scanning ${MAX_RECORDS_TO_SCAN} records)\n`);
    }

    // Step 1: Fetch conversation records from Salesloft (starting from where we left off)
    const { records: callRecords, nextPage: newNextPage } = await salesloftClient.fetchTranscripts(MAX_RECORDS_TO_SCAN, nextPage);

    if (callRecords.length === 0) {
      console.log('No conversation records found.');
      return;
    }

    // Step 2: Apply smart filtering
    console.log('\n=== APPLYING SMART FILTERS ===\n');

    let skippedDuplicates = 0;
    const recordsToProcess = callRecords.filter(t => {
      // Filter 0: Skip already processed
      if (processedIds.has(t.id.toString())) {
        skippedDuplicates++;
        return false;
      }

      // Filter 1: Must have AI transcription available
      if (!t.transcription || !t.transcription.id) {
        console.log(`Conversation ${t.id}: ✗ No AI transcription available`);
        return false;
      }

      // Filter 2: Must have sufficient duration (if available)
      if (t.duration && t.duration < MIN_DURATION) {
        console.log(`Conversation ${t.id}: ✗ Duration ${t.duration}s is below minimum ${MIN_DURATION}s`);
        return false;
      }

      const mediaType = t.media_type || 'unknown';
      const platform = t.platform || 'unknown';
      console.log(`Conversation ${t.id}: ✓ Passed filters (media: ${mediaType}, platform: ${platform}, duration: ${t.duration || 'N/A'}s)`);
      return true;
    });

    // De-duplicate records (same call ID might appear on multiple pages)
    const uniqueRecords = [];
    const seenIds = new Set();
    let duplicatesInBatch = 0;

    for (const record of recordsToProcess) {
      if (!seenIds.has(record.id.toString())) {
        uniqueRecords.push(record);
        seenIds.add(record.id.toString());
      } else {
        duplicatesInBatch++;
      }
    }

    if (skippedDuplicates > 0) {
      console.log(`\n⏭️  Skipped ${skippedDuplicates} already processed conversations`);
    }
    if (duplicatesInBatch > 0) {
      console.log(`🔗 Removed ${duplicatesInBatch} duplicate conversation IDs within this batch`);
    }
    console.log(`\n${uniqueRecords.length} out of ${callRecords.length} records passed filters\n`);

    if (uniqueRecords.length === 0) {
      console.log('No conversations to process.');
      return;
    }

    // Step 3: Authorize with Google Drive
    if (GOOGLE_DRIVE_FOLDER_ID) {
      try {
        console.log('=== AUTHORIZING GOOGLE DRIVE ===\n');
        await googleDriveService.authorize();
        console.log('✓ Authorized with Google Drive');
        console.log(`✓ Will upload to folder: ${GOOGLE_DRIVE_FOLDER_ID}\n`);
      } catch (error) {
        console.log(`⚠️  Google Drive authorization failed: ${error.message}`);
        console.log(`Files will be saved locally only.\n`);
      }
    } else {
      console.log('⚠️  GOOGLE_DRIVE_FOLDER_ID not set in .env');
      console.log(`Files will be saved locally only.\n`);
    }

    // Step 4: Fetch and save transcripts
    console.log('=== FETCHING TRANSCRIPTS ===\n');

    let successCount = 0;
    let failCount = 0;
    let aiTranscriptCount = 0;
    let manualNoteCount = 0;
    let noTranscriptCount = 0;
    let skippedNoAICount = 0;

    for (let i = 0; i < uniqueRecords.length; i++) {
      // Check if we've reached our target (only in limited mode)
      if (MODE === 'limited' && aiTranscriptCount >= TARGET_AI_TRANSCRIPTS) {
        console.log(`\n🎉 TARGET REACHED! Found ${aiTranscriptCount} AI transcripts. Stopping.\n`);
        break;
      }

      const record = uniqueRecords[i];
      const progress = MODE === 'limited'
        ? `[${i + 1}/${uniqueRecords.length}] (Found: ${aiTranscriptCount}/${TARGET_AI_TRANSCRIPTS})`
        : `[${i + 1}/${uniqueRecords.length}] (Found: ${aiTranscriptCount} AI transcripts)`;

      // Add delay between calls to respect rate limits
      if (i > 0 && API_DELAY_MS > 0) {
        await new Promise(resolve => setTimeout(resolve, API_DELAY_MS));
      }

      try {
        const mediaType = record.media_type || 'unknown';
        const platform = record.platform || 'unknown';
        console.log(`\n${progress} Processing conversation ID: ${record.id}`);
        console.log(`  → Media: ${mediaType}, Platform: ${platform}`);

        // Get transcription ID from conversation (already filtered to have this)
        const transcriptionId = record.transcription.id;
        console.log(`  📝 Transcription ID: ${transcriptionId}`);

        // Fetch Person and Account CRM IDs
        let crmData = null;
        if (record.person || record.account) {
          crmData = {
            personId: record.person?.id || null,
            accountId: record.account?.id || null,
            personCrmId: null,
            accountCrmId: null
          };

          // Fetch person details if available
          if (record.person?.id) {
            console.log(`  👤 Fetching person details (ID: ${record.person.id})...`);
            const personData = await salesloftClient.fetchPersonDetails(record.person.id);
            if (personData && personData.data) {
              crmData.personCrmId = personData.data.crm_id || null;
              if (crmData.personCrmId) {
                console.log(`  ✓ Salesforce Contact/Lead ID: ${crmData.personCrmId}`);
              }
            }
          }

          // Fetch account details if available
          if (record.account?.id) {
            console.log(`  🏢 Fetching account details (ID: ${record.account.id})...`);
            const accountData = await salesloftClient.fetchAccountDetails(record.account.id);
            if (accountData && accountData.data) {
              crmData.accountCrmId = accountData.data.crm_id || null;
              if (crmData.accountCrmId) {
                console.log(`  ✓ Salesforce Account ID: ${crmData.accountCrmId}`);
              }
            }
          }
        }

        // Save transcript to file with conversation data
        const { fileName, hasTranscript, isAITranscript, isManualNote } = await transcriptService.saveTranscriptToFile(
          record.id,
          record, // Pass the conversation record itself
          record, // Also use as callInfo
          GOOGLE_DRIVE_FOLDER_ID,
          transcriptionId, // Pass the transcriptionId directly
          crmData // Pass the CRM data
        );

        if (isAITranscript) {
          aiTranscriptCount++;
        } else if (isManualNote) {
          manualNoteCount++;
        } else if (!hasTranscript) {
          noTranscriptCount++;
        }

        successCount++;

        // Mark as processed
        processedIds.add(record.id.toString());
      } catch (error) {
        console.error(`  ✗ Failed to process conversation ${record.id}:`, error.message);
        failCount++;

        // Still mark as processed to avoid retrying failed conversations
        processedIds.add(record.id.toString());
      }

      // Save progress every 10 conversations
      if ((i + 1) % 10 === 0) {
        fileService.saveProcessedIds(processedIds, newNextPage);
      }
    }

    // Save final processed IDs and pagination state
    fileService.saveProcessedIds(processedIds, newNextPage);
    console.log(`\n💾 Saved progress: ${processedIds.size} total conversations processed`);
    console.log(`📄 Next run will start from page: ${newNextPage}`);

    console.log(`\n=== SUMMARY ===`);
    if (MODE === 'limited') {
      console.log(`🎯 Target: ${TARGET_AI_TRANSCRIPTS} AI transcripts`);
    }
    console.log(`✅ Found this run: ${aiTranscriptCount} AI transcripts`);
    console.log(`📋 Total processed (all time): ${processedIds.size} conversations`);
    console.log(`\n📊 This Run Details:`);
    console.log(`  ✓ Successfully processed: ${successCount} conversations`);
    console.log(`  ⚠️  With manual notes only: ${manualNoteCount}`);
    console.log(`  ❌ Without any transcript: ${noTranscriptCount}`);
    console.log(`  ⊘ Skipped (no AI transcript): ${skippedNoAICount}`);
    if (skippedDuplicates > 0) {
      console.log(`  ⏭️  Skipped (already processed): ${skippedDuplicates}`);
    }
    if (failCount > 0) {
      console.log(`  ✗ Failed: ${failCount} conversations`);
    }
    console.log(`\n📁 Files saved to: ${path.resolve(DOWNLOAD_FOLDER)}`);

    if (MODE === 'limited' && aiTranscriptCount < TARGET_AI_TRANSCRIPTS) {
      console.log(`\n⚠️  Only found ${aiTranscriptCount}/${TARGET_AI_TRANSCRIPTS} AI transcripts.`);
      console.log(`   Run again to scan more records, or switch to MODE='unlimited'.`);
    } else if (MODE === 'unlimited' && uniqueRecords.length === MAX_RECORDS_TO_SCAN) {
      console.log(`\n💡 Scanned ${MAX_RECORDS_TO_SCAN} records. Run again to continue processing more conversations.`);
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}
