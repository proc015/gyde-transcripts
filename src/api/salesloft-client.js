import axios from 'axios';
import fs from 'fs';

const SALESLOFT_API_URL = 'https://api.salesloft.com/v2';

/**
 * Salesloft API Client
 * Handles all API calls to Salesloft
 */
export class SalesloftClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Fetch conversations from Salesloft API with pagination support
   * This includes both phone calls AND meetings (video, etc.)
   */
  async fetchTranscripts(maxRecords = 100, startPage = 1) {
    try {
      console.log(`Fetching up to ${maxRecords} conversation records from Salesloft (starting at page ${startPage})...`);

      let allRecords = [];
      let currentPage = startPage;
      const perPage = 100; // Max allowed per page
      const maxPages = Math.ceil(maxRecords / perPage);

      while (allRecords.length < maxRecords && (currentPage - startPage) < maxPages) {
        const response = await axios.get(`${SALESLOFT_API_URL}/conversations.json`, {
          headers: this.headers,
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
      fs.writeFileSync('./data/debug_response.json', JSON.stringify({ data: allRecords.slice(0, 10) }, null, 2));
      console.log('Sample API response saved to data/debug_response.json');

      return { records: allRecords, nextPage: currentPage };
    } catch (error) {
      console.error('Error fetching conversations:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Fetch transcript text from call activity
   */
  async fetchTranscriptFromCall(callId) {
    try {
      const response = await axios.get(`${SALESLOFT_API_URL}/activities/calls/${callId}.json`, {
        headers: this.headers
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
  async fetchTranscriptFromDialerRecording(uuid) {
    try {
      const response = await axios.get(`${SALESLOFT_API_URL}/dialer_recordings/${uuid}.json`, {
        headers: this.headers
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
  async fetchNoteContent(noteId) {
    try {
      const response = await axios.get(`${SALESLOFT_API_URL}/notes/${noteId}.json`, {
        headers: this.headers
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching note ${noteId}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch person details including Salesforce CRM ID
   */
  async fetchPersonDetails(personId) {
    try {
      const response = await axios.get(`${SALESLOFT_API_URL}/people/${personId}.json`, {
        headers: this.headers
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching person ${personId}:`, error.message);
      return null; // Return null instead of throwing to handle gracefully
    }
  }

  /**
   * Fetch account details including Salesforce CRM ID
   */
  async fetchAccountDetails(accountId) {
    try {
      const response = await axios.get(`${SALESLOFT_API_URL}/accounts/${accountId}.json`, {
        headers: this.headers
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching account ${accountId}:`, error.message);
      return null; // Return null instead of throwing to handle gracefully
    }
  }

  /**
   * Fetch transcription sentences (the actual transcript text)
   * Handles pagination to ensure we get ALL sentences
   */
  async fetchTranscriptionSentences(transcriptionId) {
    try {
      let allSentences = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const response = await axios.get(`${SALESLOFT_API_URL}/transcriptions/${transcriptionId}/sentences.json`, {
          headers: this.headers,
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
  async fetchConversationForCall(callUuid) {
    try {
      // Try to find conversation by call UUID
      const response = await axios.get(`${SALESLOFT_API_URL}/conversations/calls.json`, {
        headers: this.headers,
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
  async findConversationForCall(callDataRecordId) {
    try {
      // Fetch recent conversations (up to 100)
      const response = await axios.get(`${SALESLOFT_API_URL}/conversations.json`, {
        headers: this.headers,
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
        fs.writeFileSync('./data/debug_conversation.json', JSON.stringify(conversations[0], null, 2));
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
}

/**
 * Helper function to list conversations (used internally)
 */
async function listConversations(callId) {
  // This function might not be used - keeping for compatibility
  throw new Error('listConversations not implemented - use findConversationForCall instead');
}
