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

/**
 * Fetch transcripts from Salesloft API with pagination support
 */
async function fetchTranscripts(maxRecords = 100) {
  try {
    console.log(`Fetching up to ${maxRecords} call records from Salesloft...`);

    let allRecords = [];
    let currentPage = 1;
    const perPage = 100; // Max allowed per page

    while (allRecords.length < maxRecords) {
      const response = await axios.get(`${SALESLOFT_API_URL}/call_data_records.json`, {
        headers: {
          'Authorization': `Bearer ${SALESLOFT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        params: {
          has_recording: true, // Only get calls with recordings
          per_page: perPage,
          page: currentPage
        }
      });

      const records = response.data.data || [];
      if (records.length === 0) {
        break; // No more records
      }

      allRecords = allRecords.concat(records);

      // Check if there are more pages
      const metadata = response.data.metadata;
      if (!metadata?.paging?.next_page) {
        break; // No more pages
      }

      currentPage++;
      console.log(`  Fetched page ${currentPage - 1}, got ${records.length} records (total: ${allRecords.length})`);
    }

    // Trim to max records if we got more
    if (allRecords.length > maxRecords) {
      allRecords = allRecords.slice(0, maxRecords);
    }

    console.log(`\nFound ${allRecords.length} total call records`);

    // Save raw response for debugging (just first page)
    fs.writeFileSync('./debug_response.json', JSON.stringify({ data: allRecords.slice(0, 10) }, null, 2));
    console.log('Sample API response saved to debug_response.json');

    return allRecords;
  } catch (error) {
    console.error('Error fetching transcripts:', error.response?.data || error.message);
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

        if (currentPage === 1 && totalPages > 1) {
          console.log(`  [AI TRANSCRIPT] Transcript spans ${totalPages} pages, fetching all...`);
        }
      }

      currentPage++;
    } while (currentPage <= totalPages);

    console.log(`  [AI TRANSCRIPT] Retrieved ${allSentences.length} total sentences from ${totalPages} page(s)`);

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
 * List all conversations (alternative approach)
 */
async function listConversations(callDataRecordId) {
  try {
    const response = await axios.get(`${SALESLOFT_API_URL}/conversations.json`, {
      headers: {
        'Authorization': `Bearer ${SALESLOFT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        call_data_record_id: callDataRecordId,
        per_page: 1
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
async function saveTranscriptToFile(callId, transcriptData, callInfo, driveAuth) {
  try {
    // Ensure download folder exists
    if (!fs.existsSync(DOWNLOAD_FOLDER)) {
      fs.mkdirSync(DOWNLOAD_FOLDER, { recursive: true });
    }

    const fileName = `transcript_call_${callId}_${Date.now()}.txt`;
    const filePath = path.join(DOWNLOAD_FOLDER, fileName);

    // Debug: Log available fields
    const data = transcriptData.data || transcriptData;
    console.log(`  Available fields:`, Object.keys(data));

    // Check if recordings array has transcripts
    if (data.recordings && data.recordings.length > 0) {
      console.log(`  Found ${data.recordings.length} recordings`);
      console.log(`  Recording fields:`, Object.keys(data.recordings[0]));
    }

    let content = `=== CALL TRANSCRIPT ===\n`;
    content += `Call ID: ${callId}\n`;
    content += `Date: ${callInfo.created_at}\n`;
    content += `Duration: ${callInfo.duration} seconds\n`;
    content += `From: ${callInfo.from}\n`;
    content += `To: ${callInfo.to}\n`;
    content += `Disposition: ${data.disposition || 'N/A'}\n`;
    content += `Connected: ${data.connected ? 'Yes' : 'No'}\n`;
    content += `\n=== TRANSCRIPT ===\n\n`;

    // Try different possible locations for transcript text
    let foundTranscript = false;

    // FIRST: Try to fetch actual AI conversation transcription
    if (callInfo.id || callInfo.call_uuid) {
      try {
        console.log(`  [AI TRANSCRIPT] Trying to fetch conversation...`);

        // Try using call_data_record_id first
        let conversationData = null;
        if (callInfo.id) {
          try {
            conversationData = await listConversations(callInfo.id);
          } catch (err) {
            console.log(`  [AI TRANSCRIPT] List conversations failed, trying call UUID...`);
          }
        }

        // Fallback to call UUID
        if (!conversationData && callInfo.call_uuid) {
          conversationData = await fetchConversationForCall(callInfo.call_uuid);
        }

        // Check if we got conversation data with transcription
        if (conversationData && conversationData.data && conversationData.data.length > 0) {
          const conversation = conversationData.data[0];
          console.log(`  [AI TRANSCRIPT] Found conversation ID:`, conversation.id);

          // Try to get transcription ID from conversation
          if (conversation.transcription_id || conversation.transcription) {
            const transcriptionId = conversation.transcription_id || conversation.transcription?.id || conversation.transcription;
            console.log(`  [AI TRANSCRIPT] Fetching transcription sentences (ID: ${transcriptionId})...`);

            const sentencesData = await fetchTranscriptionSentences(transcriptionId);

            if (sentencesData && sentencesData.data && sentencesData.data.length > 0) {
              console.log(`  ✅ [AI TRANSCRIPT] Found ${sentencesData.data.length} AI-generated transcript sentences!`);

              // Combine all sentences into full transcript
              const transcript = sentencesData.data
                .sort((a, b) => a.order_number - b.order_number)
                .map(sentence => sentence.text)
                .join(' ');

              content += transcript;
              foundTranscript = true;
            }
          } else {
            console.log(`  [AI TRANSCRIPT] Conversation found but no transcription_id available`);
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
      if (content.includes('[AI TRANSCRIPT]') || content.includes('AI-generated')) {
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
async function main() {
  try {
    // Configuration - adjust these values as needed
    const TARGET_AI_TRANSCRIPTS = 15; // Keep fetching until we find this many AI transcripts
    const MAX_RECORDS_TO_SCAN = 50; // Safety limit: don't scan more than this many records (temporarily lowered for debugging)
    const MIN_DURATION = 30; // Minimum call duration in seconds

    console.log(`\n🎯 TARGET: Find ${TARGET_AI_TRANSCRIPTS} calls with AI transcripts (scanning up to ${MAX_RECORDS_TO_SCAN} records)\n`);

    // Step 1: Fetch call records from Salesloft (will fetch all we need)
    const callRecords = await fetchTranscripts(MAX_RECORDS_TO_SCAN);

    if (callRecords.length === 0) {
      console.log('No call records found.');
      return;
    }

    // Step 2: Apply smart filtering
    console.log('\n=== APPLYING SMART FILTERS ===\n');

    const recordsToProcess = callRecords.filter(t => {
      // Filter 1: Must be completed
      if (t.status !== 'completed') {
        console.log(`Call ${t.id}: ✗ Status is '${t.status}' (not completed)`);
        return false;
      }

      // Filter 2: Must have sufficient duration
      if (!t.duration || t.duration < MIN_DURATION) {
        console.log(`Call ${t.id}: ✗ Duration ${t.duration}s is below minimum ${MIN_DURATION}s`);
        return false;
      }

      // Filter 3: Must have call activity (needed to fetch conversation)
      if (!t.call || !t.call.id) {
        console.log(`Call ${t.id}: ✗ No call activity ID`);
        return false;
      }

      console.log(`Call ${t.id}: ✓ Passed filters (status: ${t.status}, duration: ${t.duration}s)`);
      return true;
    });

    console.log(`\n${recordsToProcess.length} out of ${callRecords.length} records passed filters\n`);

    if (recordsToProcess.length === 0) {
      console.log('No calls to process.');
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

    for (let i = 0; i < recordsToProcess.length; i++) {
      // Check if we've reached our target
      if (aiTranscriptCount >= TARGET_AI_TRANSCRIPTS) {
        console.log(`\n🎉 TARGET REACHED! Found ${aiTranscriptCount} AI transcripts. Stopping.\n`);
        break;
      }

      const record = recordsToProcess[i];
      const progress = `[${i + 1}/${recordsToProcess.length}] (Found: ${aiTranscriptCount}/${TARGET_AI_TRANSCRIPTS})`;

      try {
        console.log(`\n${progress} Processing call ID: ${record.id}`);

        // STEP 1: Check if this call has an AI transcript by fetching the conversation
        let conversationData = null;
        try {
          conversationData = await listConversations(record.id);

          // DEBUG: Log what we got back
          if (i < 3) { // Only log first 3 to avoid spam
            console.log(`  [DEBUG] Conversation response:`, JSON.stringify(conversationData, null, 2));
          }
        } catch (error) {
          console.log(`  ✗ Could not fetch conversation: ${error.message}`);
          failCount++;
          continue;
        }

        // Check if conversation has transcription_id
        if (!conversationData || !conversationData.data || conversationData.data.length === 0) {
          console.log(`  ✗ No conversation found for this call`);
          skippedNoAICount++;
          continue;
        }

        const conversation = conversationData.data[0];

        // DEBUG: Show all conversation fields
        if (i < 3) {
          console.log(`  [DEBUG] Conversation fields:`, Object.keys(conversation));
          console.log(`  [DEBUG] transcription object:`, conversation.transcription);
        }

        // Check for transcription - it's an object with an 'id' field, not a direct transcription_id
        const transcription = conversation.transcription;
        const hasAITranscript = transcription && transcription.id ? true : false;

        if (!hasAITranscript) {
          console.log(`  ⊘ No AI transcript available - skipping`);
          skippedNoAICount++;
          continue;
        }

        const transcriptionId = transcription.id;
        console.log(`  ✓ AI transcript available (transcription ID: ${transcriptionId})`);

        // STEP 2: Fetch the actual call activity data (for metadata)
        let transcriptData = null;
        try {
          console.log(`  Fetching call activity metadata...`);
          transcriptData = await fetchTranscriptFromCall(record.call.id);
        } catch (error) {
          console.log(`  ✗ Call activity fetch failed: ${error.message}`);
          failCount++;
          continue;
        }

        // STEP 3: Save transcript to file (the saveTranscriptToFile function will fetch the sentences)
        const { fileName, hasTranscript, isAITranscript, isManualNote } = await saveTranscriptToFile(
          record.id,
          transcriptData,
          record,
          driveAuth
        );

        if (isAITranscript) {
          aiTranscriptCount++;
        } else if (isManualNote) {
          manualNoteCount++;
        } else if (!hasTranscript) {
          noTranscriptCount++;
        }

        successCount++;
      } catch (error) {
        console.error(`  ✗ Failed to process call ${record.id}:`, error.message);
        failCount++;
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`🎯 Target: ${TARGET_AI_TRANSCRIPTS} AI transcripts`);
    console.log(`✅ Found: ${aiTranscriptCount} AI transcripts`);
    console.log(`\n📊 Details:`);
    console.log(`  ✓ Successfully processed: ${successCount} calls`);
    console.log(`  ⚠️  With manual notes only: ${manualNoteCount}`);
    console.log(`  ❌ Without any transcript: ${noTranscriptCount}`);
    console.log(`  ⊘ Skipped (no AI transcript): ${skippedNoAICount}`);
    if (failCount > 0) {
      console.log(`  ✗ Failed: ${failCount} calls`);
    }
    console.log(`\n📁 Files saved to: ${path.resolve(DOWNLOAD_FOLDER)}`);

    if (aiTranscriptCount < TARGET_AI_TRANSCRIPTS) {
      console.log(`\n⚠️  Only found ${aiTranscriptCount}/${TARGET_AI_TRANSCRIPTS} AI transcripts.`);
      console.log(`   Consider increasing MAX_RECORDS_TO_SCAN or checking if transcription is enabled in Salesloft.`);
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();
