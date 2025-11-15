import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { Readable } from 'stream';

dotenv.config();

const SALESLOFT_API_KEY = process.env.SALESLOFT_API_KEY;
const SALESLOFT_API_URL = 'https://api.salesloft.com/v2';

// Google Drive configuration
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const OAUTH_CREDENTIALS_PATH = './oauth_credentials.json';
const TOKEN_PATH = './token.json';
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// Local download folder (for backup/debugging)
const DOWNLOAD_FOLDER = './recordings';
const PROCESSED_IDS_FILE = './processed_conversation_ids.json';
const LEGACY_PROCESSED_IDS_FILE = './processed_call_ids.json';

/**
 * Load processed conversation IDs and pagination state from file
 * Also checks for legacy call IDs file and merges them
 */
function loadProcessedIds() {
  try {
    let processedIds = new Set();
    let nextPage = 1;

    // Load legacy call IDs if they exist
    if (fs.existsSync(LEGACY_PROCESSED_IDS_FILE)) {
      const legacyData = JSON.parse(fs.readFileSync(LEGACY_PROCESSED_IDS_FILE, 'utf8'));
      processedIds = new Set(legacyData.processedIds || []);
      nextPage = legacyData.nextPage || 1;
      console.log(`  Loaded ${processedIds.size} legacy call IDs from ${LEGACY_PROCESSED_IDS_FILE}`);
    }

    // Load current conversation IDs (overwrites page number)
    if (fs.existsSync(PROCESSED_IDS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROCESSED_IDS_FILE, 'utf8'));
      const newIds = new Set(data.processedIds || []);
      // Merge with legacy IDs
      newIds.forEach(id => processedIds.add(id));
      nextPage = data.nextPage || nextPage;
    }

    return { processedIds, nextPage };
  } catch (error) {
    console.log(`Warning: Could not load processed IDs: ${error.message}`);
  }
  return { processedIds: new Set(), nextPage: 1 };
}

/**
 * Save processed conversation IDs and pagination state to file
 */
function saveProcessedIds(processedIds, nextPage = null) {
  try {
    // Load existing data to preserve nextPage if not provided
    let currentNextPage = 1;
    if (fs.existsSync(PROCESSED_IDS_FILE)) {
      const existingData = JSON.parse(fs.readFileSync(PROCESSED_IDS_FILE, 'utf8'));
      currentNextPage = existingData.nextPage || 1;
    }

    const data = {
      lastUpdated: new Date().toISOString(),
      processedIds: Array.from(processedIds),
      nextPage: nextPage !== null ? nextPage : currentNextPage
    };
    fs.writeFileSync(PROCESSED_IDS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`Warning: Could not save processed IDs: ${error.message}`);
  }
}

/**
 * Fetch conversations from Salesloft API with pagination support
 * This includes both phone calls AND meetings (video, etc.)
 */
async function fetchTranscripts(maxRecords = 100, startPage = 1) {
  try {
    console.log(`Fetching up to ${maxRecords} conversation records from Salesloft (starting at page ${startPage})...`);

    let allRecords = [];
    let currentPage = startPage;
    const perPage = 100; // Max allowed per page
    const maxPages = Math.ceil(maxRecords / perPage);

    while (allRecords.length < maxRecords && (currentPage - startPage) < maxPages) {
      const response = await axios.get(`${SALESLOFT_API_URL}/conversations.json`, {
        headers: {
          'Authorization': `Bearer ${SALESLOFT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        params: {
          per_page: perPage,
          page: currentPage
        }
      });

      const records = response.data.data || [];
      if (records.length === 0) {
        console.log(`  Page ${currentPage} returned no records - reached end of data`);
        break; // No more records
      }

      allRecords = allRecords.concat(records);

      // Check if there are more pages
      const metadata = response.data.metadata;
      if (!metadata?.paging?.next_page) {
        console.log(`  Page ${currentPage} is the last page`);
        currentPage++; // Increment so next run knows we've reached the end
        break; // No more pages
      }

      console.log(`  Fetched page ${currentPage}, got ${records.length} records (total: ${allRecords.length})`);
      currentPage++;
    }

    // Trim to max records if we got more
    if (allRecords.length > maxRecords) {
      allRecords = allRecords.slice(0, maxRecords);
    }

    console.log(`\nFound ${allRecords.length} total conversation records (pages ${startPage}-${currentPage - 1})`);

    // Save raw response for debugging (just first page)
    fs.writeFileSync('./debug_response.json', JSON.stringify({ data: allRecords.slice(0, 10) }, null, 2));
    console.log('Sample API response saved to debug_response.json');

    return { records: allRecords, nextPage: currentPage };
  } catch (error) {
    console.error('Error fetching conversations:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Fetch transcript text from call activity
 */
async function fetchTranscriptFromCall(callId) {
  try {
    const response = await axios.get(`${SALESLOFT_API_URL}/activities/calls/${callId}.json`, {
      headers: {
        'Authorization': `Bearer ${SALESLOFT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error(`Error fetching call activity ${callId}:`, error.message);
    throw error;
  }
}

/**
 * Fetch transcript from dialer recording (alternative method)
 */
async function fetchTranscriptFromDialerRecording(uuid) {
  try {
    const response = await axios.get(`${SALESLOFT_API_URL}/dialer_recordings/${uuid}.json`, {
      headers: {
        'Authorization': `Bearer ${SALESLOFT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error(`Error fetching dialer recording ${uuid}:`, error.message);
    throw error;
  }
}

/**
 * Fetch note content from notes API
 */
async function fetchNoteContent(noteId) {
  try {
    const response = await axios.get(`${SALESLOFT_API_URL}/notes/${noteId}.json`, {
      headers: {
        'Authorization': `Bearer ${SALESLOFT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error(`Error fetching note ${noteId}:`, error.message);
    throw error;
  }
}

/**
 * Fetch transcription sentences (the actual transcript text)
 * Handles pagination to ensure we get ALL sentences
 */
async function fetchTranscriptionSentences(transcriptionId) {
  try {
    let allSentences = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const response = await axios.get(`${SALESLOFT_API_URL}/transcriptions/${transcriptionId}/sentences.json`, {
        headers: {
          'Authorization': `Bearer ${SALESLOFT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        params: {
          per_page: 100, // Max per page
          page: currentPage
        }
      });

      const sentences = response.data.data || [];
      allSentences = allSentences.concat(sentences);

      // Check pagination metadata
      if (response.data.metadata && response.data.metadata.paging) {
        const paging = response.data.metadata.paging;
        totalPages = Math.ceil(paging.total_count / paging.per_page) || 1;
      }

      currentPage++;
    } while (currentPage <= totalPages);

    return { data: allSentences };
  } catch (error) {
    console.error(`Error fetching transcription sentences ${transcriptionId}:`, error.message);
    throw error;
  }
}

/**
 * Fetch conversation data for a call
 */
async function fetchConversationForCall(callUuid) {
  try {
    // Try to find conversation by call UUID
    const response = await axios.get(`${SALESLOFT_API_URL}/conversations/calls.json`, {
      headers: {
        'Authorization': `Bearer ${SALESLOFT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        call_uuid: callUuid
      }
    });

    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      console.error(`  Error details:`, JSON.stringify(error.response.data));
    }
    throw error;
  }
}

/**
 * Fetch all conversations and find one matching the call_data_record_id
 */
async function findConversationForCall(callDataRecordId) {
  try {
    // Fetch recent conversations (up to 100)
    const response = await axios.get(`${SALESLOFT_API_URL}/conversations.json`, {
      headers: {
        'Authorization': `Bearer ${SALESLOFT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        per_page: 100
      }
    });

    // Debug: Save first conversation to see structure
    const conversations = response.data.data || [];
    if (conversations.length > 0 && callDataRecordId === 474877404) {
      // Only log for the first call to avoid spam
      console.log(`  🔍 DEBUG: Fetched ${conversations.length} conversations`);
      console.log(`  🔍 DEBUG: First conversation structure:`, JSON.stringify(conversations[0], null, 2));
      fs.writeFileSync('./debug_conversation.json', JSON.stringify(conversations[0], null, 2));
    }

    // Find the conversation that matches our call_data_record_id
    // The API returns call_id as a STRING, so we need to convert callDataRecordId to string for comparison
    const matchingConversation = conversations.find(conv =>
      conv.call_id === String(callDataRecordId)
    );

    if (matchingConversation) {
      console.log(`  ✓ Found matching conversation (ID: ${matchingConversation.id.substring(0, 8)}...)`);
      return { data: [matchingConversation] };
    }

    return { data: [] };
  } catch (error) {
    if (error.response && error.response.data) {
      console.error(`  Error details:`, JSON.stringify(error.response.data));
    }
    throw error;
  }
}

/**
 * Authorize with Google Drive using OAuth
 */
async function authorizeGoogleDrive() {
  try {
    // Load OAuth credentials
    const credentials = JSON.parse(fs.readFileSync(OAUTH_CREDENTIALS_PATH, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check if we have a saved token
    if (fs.existsSync(TOKEN_PATH)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      oAuth2Client.setCredentials(token);
      return oAuth2Client;
    }

    // If no token, we need to authorize
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    console.log('\n⚠️  AUTHORIZATION REQUIRED ⚠️');
    console.log('\nPlease authorize this app by visiting this URL:\n');
    console.log(authUrl);
    console.log('\nAfter authorizing, you will get a code.');
    console.log('Paste the code here and press Enter:\n');

    // Wait for user input
    const code = await new Promise((resolve) => {
      process.stdin.once('data', (data) => {
        resolve(data.toString().trim());
      });
    });

    // Get token from code
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Save token for future use
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    console.log('\n✓ Token saved! You won\'t need to authorize again.\n');

    return oAuth2Client;
  } catch (error) {
    console.error('Error authorizing with Google Drive:', error.message);
    throw error;
  }
}

/**
 * Upload text content to Google Drive
 */
async function uploadToGoogleDrive(authClient, fileName, textContent) {
  try {
    const drive = google.drive({ version: 'v3', auth: authClient });

    // Create a readable stream from the text content
    const bufferStream = new Readable();
    bufferStream.push(textContent);
    bufferStream.push(null);

    const fileMetadata = {
      name: fileName,
      parents: [GOOGLE_DRIVE_FOLDER_ID], // Upload to the shared folder
      mimeType: 'text/plain'
    };

    const media = {
      mimeType: 'text/plain',
      body: bufferStream
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink'
    });

    console.log(`    ✓ Uploaded to Google Drive: ${response.data.name}`);
    return response.data;
  } catch (error) {
    console.error(`    ✗ Google Drive upload failed: ${error.message}`);
    throw error;
  }
}

/**
 * Save transcript to file
 */
async function saveTranscriptToFile(callId, transcriptData, callInfo, driveAuth, transcriptionId = null) {
  try {
    // Ensure download folder exists
    if (!fs.existsSync(DOWNLOAD_FOLDER)) {
      fs.mkdirSync(DOWNLOAD_FOLDER, { recursive: true });
    }

    const data = transcriptData.data || transcriptData;

    // Extract media type and platform from conversation data
    const mediaType = callInfo.media_type || data.media_type || 'unknown';
    const platform = callInfo.platform || data.platform || 'unknown';

    // Sanitize media type for filename (lowercase, no spaces or special chars)
    const mediaTypeForFilename = mediaType.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const fileName = `transcript_${mediaTypeForFilename}_${callId}_${Date.now()}.txt`;
    const filePath = path.join(DOWNLOAD_FOLDER, fileName);

    let content = `=== CONVERSATION TRANSCRIPT ===\n`;
    content += `Conversation ID: ${callId}\n`;
    content += `Date: ${callInfo.created_at}\n`;
    content += `Duration: ${callInfo.duration || 'N/A'} seconds\n`;
    content += `Media Type: ${mediaType}\n`;
    content += `Platform: ${platform}\n`;

    // Add call-specific fields if available
    if (callInfo.from) content += `From: ${callInfo.from}\n`;
    if (callInfo.to) content += `To: ${callInfo.to}\n`;
    if (data.disposition) content += `Disposition: ${data.disposition}\n`;
    if (data.connected !== undefined) content += `Connected: ${data.connected ? 'Yes' : 'No'}\n`;

    content += `\n=== TRANSCRIPT ===\n\n`;

    // Try different possible locations for transcript text
    let foundTranscript = false;

    // FIRST: Try to fetch actual AI conversation transcription using provided transcriptionId
    if (transcriptionId) {
      try {
        console.log(`  🔍 Fetching sentences for transcription ID: ${transcriptionId}`);

        const sentencesData = await fetchTranscriptionSentences(transcriptionId);

        if (sentencesData && sentencesData.data && sentencesData.data.length > 0) {
          console.log(`  ✅ Retrieved ${sentencesData.data.length} AI transcript sentences`);

          // Combine all sentences into full transcript
          const transcript = sentencesData.data
            .sort((a, b) => a.order_number - b.order_number)
            .map(sentence => sentence.text)
            .join(' ');

          content += `[AI-GENERATED TRANSCRIPT - ${sentencesData.data.length} sentences]\n\n`;
          content += transcript;
          foundTranscript = true;
        }
      } catch (error) {
        console.log(`  ✗ [AI TRANSCRIPT] Failed for transcription ${transcriptionId}: ${error.message}`);
      }
    }

    // FALLBACK: Try to fetch transcription ID from conversation (if not provided)
    if (!foundTranscript && (callInfo.id || callInfo.call_uuid)) {
      try {
        // Try using call_data_record_id first
        let conversationData = null;
        if (callInfo.id) {
          try {
            conversationData = await listConversations(callInfo.id);
          } catch (err) {
            // Silently try call UUID fallback
          }
        }

        // Fallback to call UUID
        if (!conversationData && callInfo.call_uuid) {
          conversationData = await fetchConversationForCall(callInfo.call_uuid);
        }

        // Check if we got conversation data with transcription
        if (conversationData && conversationData.data && conversationData.data.length > 0) {
          const conversation = conversationData.data[0];

          // Try to get transcription ID from conversation
          if (conversation.transcription_id || conversation.transcription) {
            const fallbackTranscriptionId = conversation.transcription_id || conversation.transcription?.id || conversation.transcription;
            console.log(`  Fetching AI transcript sentences (fallback) (${fallbackTranscriptionId.substring(0, 8)}...)...`);

            const sentencesData = await fetchTranscriptionSentences(fallbackTranscriptionId);

            if (sentencesData && sentencesData.data && sentencesData.data.length > 0) {
              console.log(`  ✅ Retrieved ${sentencesData.data.length} AI transcript sentences`);

              // Combine all sentences into full transcript
              const transcript = sentencesData.data
                .sort((a, b) => a.order_number - b.order_number)
                .map(sentence => sentence.text)
                .join(' ');

              content += `[AI-GENERATED TRANSCRIPT - ${sentencesData.data.length} sentences]\n\n`;
              content += transcript;
              foundTranscript = true;
            }
          }
        }
      } catch (error) {
        console.log(`  ✗ [AI TRANSCRIPT] Failed: ${error.message}`);
      }
    }

    // Check recordings array for transcripts
    if (!foundTranscript && data.recordings && data.recordings.length > 0) {
      for (const recording of data.recordings) {
        if (recording.transcript || recording.transcription) {
          content += recording.transcript || recording.transcription;
          foundTranscript = true;
          break;
        }
      }
    }

    // Check top-level fields
    if (!foundTranscript) {
      if (data.transcript) {
        content += data.transcript;
        foundTranscript = true;
      } else if (data.transcription) {
        content += data.transcription;
        foundTranscript = true;
      } else if (data.conversation_transcript) {
        content += data.conversation_transcript;
        foundTranscript = true;
      } else if (data.note) {
        // Note might be an object, extract its content
        if (typeof data.note === 'string') {
          content += data.note;
          foundTranscript = true;
        } else if (typeof data.note === 'object' && data.note !== null) {
          console.log(`  Note is an object with fields:`, Object.keys(data.note));

          // If note has an ID, fetch the actual note content
          if (data.note.id) {
            try {
              console.log(`  [MANUAL NOTE] Fetching note content from API (ID: ${data.note.id})...`);
              const noteData = await fetchNoteContent(data.note.id);

              // Extract content from note data
              const noteContent = noteData.data || noteData;
              if (noteContent.content) {
                content += `[MANUAL NOTE - Not AI Transcript]:\n\n${noteContent.content}`;
                foundTranscript = true;
                console.log(`  ⚠️  [MANUAL NOTE] Found manual note (not AI transcript)`);
              } else {
                content += `Note data (no content field):\n${JSON.stringify(noteData, null, 2)}`;
                foundTranscript = true;
              }
            } catch (error) {
              console.log(`  ✗ [MANUAL NOTE] Failed to fetch: ${error.message}`);
              content += `Failed to fetch note ${data.note.id}: ${error.message}`;
            }
          } else if (data.note.content) {
            content += data.note.content;
            foundTranscript = true;
          } else if (data.note.text) {
            content += data.note.text;
            foundTranscript = true;
          } else if (data.note.body) {
            content += data.note.body;
            foundTranscript = true;
          } else {
            // Save the note object as JSON
            content += JSON.stringify(data.note, null, 2);
            foundTranscript = true;
          }
        }
      }
    }

    if (!foundTranscript) {
      // If we can't find a transcript, save the structure for debugging
      content += `No transcript text found. Raw data:\n\n`;
      content += JSON.stringify(transcriptData, null, 2);
    }

    // Save locally first (for backup)
    fs.writeFileSync(filePath, content, 'utf8');

    // Determine the type of content
    let contentType = 'no transcript found';
    let isAITranscript = false;
    let isManualNote = false;

    if (foundTranscript) {
      if (content.includes('[AI-GENERATED TRANSCRIPT') || content.includes('AI-generated')) {
        contentType = '✅ AI TRANSCRIPT';
        isAITranscript = true;
      } else if (content.includes('[MANUAL NOTE')) {
        contentType = '⚠️  MANUAL NOTE ONLY';
        isManualNote = true;
      } else {
        contentType = 'transcript data (unknown type)';
      }
    }

    console.log(`  ✓ Saved locally: ${fileName} (${contentType})`);

    // Upload to Google Drive
    if (driveAuth && GOOGLE_DRIVE_FOLDER_ID) {
      try {
        await uploadToGoogleDrive(driveAuth, fileName, content);
      } catch (error) {
        console.log(`  ⚠️  Google Drive upload failed, but file is saved locally`);
      }
    }

    return {
      fileName,
      filePath,
      hasTranscript: foundTranscript,
      isAITranscript,
      isManualNote
    };
  } catch (error) {
    console.error(`Error saving transcript for call ${callId}:`, error.message);
    throw error;
  }
}

/**
 * Main function to orchestrate the process
 */
async function main(config = null) {
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

    // Load previously processed conversation IDs and pagination state
    const { processedIds, nextPage } = loadProcessedIds();
    console.log(`\n📋 Previously processed: ${processedIds.size} conversations`);
    console.log(`📄 Resuming from page: ${nextPage}`);

    if (MODE === 'limited') {
      console.log(`🎯 MODE: Limited - Target ${TARGET_AI_TRANSCRIPTS} new AI transcripts\n`);
    } else {
      console.log(`🎯 MODE: Unlimited - Process all available conversations (scanning ${MAX_RECORDS_TO_SCAN} records)\n`);
    }

    // Step 1: Fetch conversation records from Salesloft (starting from where we left off)
    const { records: callRecords, nextPage: newNextPage } = await fetchTranscripts(MAX_RECORDS_TO_SCAN, nextPage);

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
    let driveAuth = null;
    if (GOOGLE_DRIVE_FOLDER_ID) {
      try {
        console.log('=== AUTHORIZING GOOGLE DRIVE ===\n');
        driveAuth = await authorizeGoogleDrive();
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

        // Save transcript to file with conversation data
        const { fileName, hasTranscript, isAITranscript, isManualNote } = await saveTranscriptToFile(
          record.id,
          record, // Pass the conversation record itself
          record, // Also use as callInfo
          driveAuth,
          transcriptionId // Pass the transcriptionId directly
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
        saveProcessedIds(processedIds, newNextPage);
      }
    }

    // Save final processed IDs and pagination state
    saveProcessedIds(processedIds, newNextPage);
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

// Export main for use by other scripts
export { main };

// Run directly if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
