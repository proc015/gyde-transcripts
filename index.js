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
 * Fetch transcripts from Salesloft API
 */
async function fetchTranscripts() {
  try {
    console.log('Fetching transcripts from Salesloft...');

    const response = await axios.get(`${SALESLOFT_API_URL}/call_data_records.json`, {
      headers: {
        'Authorization': `Bearer ${SALESLOFT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        has_recording: true, // Only get calls with recordings
        per_page: 10 // Get more to find one with actual conversation
      }
    });

    console.log(`Found ${response.data.data.length} call records`);

    // Save raw response for debugging
    fs.writeFileSync('./debug_response.json', JSON.stringify(response.data, null, 2));
    console.log('Raw API response saved to debug_response.json');

    return response.data.data;
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
 */
async function fetchTranscriptionSentences(transcriptionId) {
  try {
    const response = await axios.get(`${SALESLOFT_API_URL}/transcriptions/${transcriptionId}/sentences.json`, {
      headers: {
        'Authorization': `Bearer ${SALESLOFT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        per_page: 100 // Get up to 100 sentences per page
      }
    });

    return response.data;
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
    if (foundTranscript) {
      if (content.includes('[AI TRANSCRIPT]') || content.includes('AI-generated')) {
        contentType = '✅ AI TRANSCRIPT';
      } else if (content.includes('[MANUAL NOTE')) {
        contentType = '⚠️  MANUAL NOTE ONLY';
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

    return { fileName, filePath, hasTranscript: foundTranscript };
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
    // Step 1: Fetch call records from Salesloft
    const callRecords = await fetchTranscripts();

    if (callRecords.length === 0) {
      console.log('No call records found.');
      return;
    }

    // Step 2: Check for calls with activity IDs or dialer recordings
    console.log('\n=== CHECKING FOR TRANSCRIPT SOURCES ===\n');

    const recordsToProcess = callRecords.filter(t => {
      const hasCallActivity = t.call && t.call.id;
      const hasDialerRecording = t.dialer_recording && t.dialer_recording.uuid;

      if (hasCallActivity) {
        console.log(`Call ${t.id}: ✓ Has call activity ID ${t.call.id}`);
        return true;
      } else if (hasDialerRecording) {
        console.log(`Call ${t.id}: ✓ Has dialer recording ${t.dialer_recording.uuid}`);
        return true;
      } else {
        console.log(`Call ${t.id}: ✗ No transcript source`);
        return false;
      }
    });

    console.log(`\n${recordsToProcess.length} out of ${callRecords.length} records have transcript sources\n`);

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
    let withTranscriptCount = 0;

    for (const record of recordsToProcess) {
      try {
        console.log(`\nProcessing call ID: ${record.id}`);

        let transcriptData = null;

        // Try fetching from call activity first
        if (record.call && record.call.id) {
          try {
            console.log(`  Trying call activity ${record.call.id}...`);
            transcriptData = await fetchTranscriptFromCall(record.call.id);
            console.log(`  ✓ Fetched from call activity`);
          } catch (error) {
            console.log(`  ✗ Call activity fetch failed: ${error.message}`);
          }
        }

        // If that didn't work, try dialer recording
        if (!transcriptData && record.dialer_recording && record.dialer_recording.uuid) {
          try {
            console.log(`  Trying dialer recording ${record.dialer_recording.uuid}...`);
            transcriptData = await fetchTranscriptFromDialerRecording(record.dialer_recording.uuid);
            console.log(`  ✓ Fetched from dialer recording`);
          } catch (error) {
            console.log(`  ✗ Dialer recording fetch failed: ${error.message}`);
          }
        }

        if (!transcriptData) {
          throw new Error('No transcript data available from any source');
        }

        // Save transcript to file (and upload to Google Drive)
        const { fileName, hasTranscript } = await saveTranscriptToFile(record.id, transcriptData, record, driveAuth);

        if (hasTranscript) {
          withTranscriptCount++;
        }
        successCount++;
      } catch (error) {
        console.error(`✗ Failed to process call ${record.id}:`, error.message);
        failCount++;
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`✓ Successfully saved: ${successCount} files`);
    console.log(`✓ With actual transcript text: ${withTranscriptCount}`);
    console.log(`⚠ Without transcript text: ${successCount - withTranscriptCount}`);
    if (failCount > 0) {
      console.log(`✗ Failed: ${failCount} calls`);
    }
    console.log(`\nFiles saved to: ${path.resolve(DOWNLOAD_FOLDER)}`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();
