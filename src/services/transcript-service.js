import path from 'path';

/**
 * Transcript Processing Service
 * Handles the logic for processing and saving transcripts
 */
export class TranscriptService {
  constructor(salesloftClient, fileService, googleDriveService) {
    this.salesloftClient = salesloftClient;
    this.fileService = fileService;
    this.googleDriveService = googleDriveService;
  }

  /**
   * Save transcript to file
   */
  async saveTranscriptToFile(callId, transcriptData, callInfo, googleDriveFolderId, transcriptionId = null, crmData = null) {
    try {
      const data = transcriptData.data || transcriptData;

      // Extract media type and platform from conversation data
      const mediaType = callInfo.media_type || data.media_type || 'unknown';
      const platform = callInfo.platform || data.platform || 'unknown';

      // Sanitize media type for filename (lowercase, no spaces or special chars)
      const mediaTypeForFilename = mediaType.toLowerCase().replace(/[^a-z0-9]/g, '_');

      const fileName = `transcript_${mediaTypeForFilename}_${callId}_${Date.now()}.txt`;

      let content = `=== CONVERSATION TRANSCRIPT ===\n`;
      content += `Conversation ID: ${callId}\n`;
      content += `Date: ${callInfo.created_at}\n`;
      content += `Duration: ${callInfo.duration || 'N/A'} seconds\n`;
      content += `Media Type: ${mediaType}\n`;
      content += `Platform: ${platform}\n`;

      // Add Salesforce CRM IDs if available
      if (crmData) {
        if (crmData.personCrmId) content += `Salesforce Contact/Lead ID: ${crmData.personCrmId}\n`;
        if (crmData.accountCrmId) content += `Salesforce Account ID: ${crmData.accountCrmId}\n`;
        if (crmData.personId) content += `SalesLoft Person ID: ${crmData.personId}\n`;
        if (crmData.accountId) content += `SalesLoft Account ID: ${crmData.accountId}\n`;
      }

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

          const sentencesData = await this.salesloftClient.fetchTranscriptionSentences(transcriptionId);

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
              conversationData = await this.salesloftClient.findConversationForCall(callInfo.id);
            } catch (err) {
              // Silently try call UUID fallback
            }
          }

          // Fallback to call UUID
          if (!conversationData && callInfo.call_uuid) {
            conversationData = await this.salesloftClient.fetchConversationForCall(callInfo.call_uuid);
          }

          // Check if we got conversation data with transcription
          if (conversationData && conversationData.data && conversationData.data.length > 0) {
            const conversation = conversationData.data[0];

            // Try to get transcription ID from conversation
            if (conversation.transcription_id || conversation.transcription) {
              const fallbackTranscriptionId = conversation.transcription_id || conversation.transcription?.id || conversation.transcription;
              console.log(`  Fetching AI transcript sentences (fallback) (${fallbackTranscriptionId.substring(0, 8)}...)...`);

              const sentencesData = await this.salesloftClient.fetchTranscriptionSentences(fallbackTranscriptionId);

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
                const noteData = await this.salesloftClient.fetchNoteContent(data.note.id);

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
      const filePath = this.fileService.writeTranscriptFile(fileName, content);

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
      if (googleDriveFolderId && this.googleDriveService.getAuthClient()) {
        try {
          await this.googleDriveService.uploadFile(fileName, content, googleDriveFolderId);
        } catch (error) {
          console.log(`  ⚠️  Google Drive upload failed, but file is saved locally`);
        }
      }

      // Save to CSV mapping file
      if (crmData) {
        this.fileService.saveMappingRecord({
          conversationId: callId,
          filename: fileName,
          personId: crmData.personId,
          personCrmId: crmData.personCrmId,
          accountId: crmData.accountId,
          accountCrmId: crmData.accountCrmId,
          mediaType: mediaType,
          platform: platform,
          date: callInfo.created_at,
          duration: callInfo.duration
        });
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
}
