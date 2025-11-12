# Salesloft Call Transcripts to Google Drive

This script pulls call transcript TEXT from Salesloft via their API and uploads them to Google Drive.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Salesloft API Key

Make sure your `.env` file has your Salesloft API key:
```
SALESLOFT_API_KEY=your_api_key_here
```

### 3. Run the Script

```bash
npm start
```

## What the Script Does

1. Fetches call data records from Salesloft API with pagination support
2. Applies smart filtering (completed calls, minimum duration, has activity ID)
3. Checks for AI transcripts early to skip calls without transcription_id
4. For calls with AI transcripts:
   - Fetches ALL sentence pages (handles pagination automatically)
   - Combines sentences into complete conversation transcripts
   - Saves as text files locally and uploads to Google Drive
5. Provides detailed progress tracking and summary statistics

## Configuration

You can adjust these settings at the top of `main()` in `index.js`:

```javascript
const MAX_RECORDS_TO_FETCH = 100; // How many call records to fetch
const MIN_DURATION = 30;           // Minimum call duration in seconds
```

## Output

- Files are saved to: `./recordings/`
- File naming format: `transcript_call_{callId}_{timestamp}.txt`
- Each file includes:
  - Call metadata (ID, date, duration, phone numbers)
  - **Complete** AI-generated transcript text (all sentences, paginated automatically)

### Console Output Indicators

- `✅ AI TRANSCRIPT` - Full conversation transcript from AI speech-to-text
- `⚠️ MANUAL NOTE ONLY` - User-typed summary (not conversation transcript)
- `⊘ Skipped (no AI transcript)` - Call had no transcription_id, skipped early

### Summary Statistics

The script provides detailed statistics:
```
=== SUMMARY ===
✓ Successfully processed: 8 calls
  ✅ With AI transcripts: 5
  ⚠️  With manual notes only: 2
  ❌ Without any transcript: 1
⊘ Skipped (no AI transcript): 32
✗ Failed: 0 calls
```

## After Download

Once the transcripts are downloaded to your computer, you can:
- Manually upload them to Google Drive
- Process them with text analysis tools
- Search through them for specific content
- Store them in your preferred location

## Notes

- **Smart Filtering**: Only processes completed calls with minimum 30s duration
- **AI Transcript Detection**: Automatically checks for `transcription_id` and skips calls without AI transcripts
- **Complete Transcripts**: Handles pagination automatically to fetch ALL sentences (no truncation)
- **Efficient**: Skips calls early if no AI transcript exists, saving ~80% of API calls
- **Google Drive Upload**: Files are saved locally first, then uploaded to Google Drive
- Files are plain text (.txt format)
- If a transcript fails to download, the script continues with the next one

## How AI Transcripts Work

See [EXPLAINED.md](./EXPLAINED.md) for a detailed technical explanation of:
- The 3-step API process (Call Data → Conversation → Sentences)
- How AI transcripts are detected and distinguished from manual notes
- JSON schemas for each API endpoint
- Pagination handling for complete transcripts
- Scaling and performance optimizations

## Troubleshooting

### "Error fetching transcripts"
- Verify your `SALESLOFT_API_KEY` is correct in the `.env` file
- Check that the API key has the necessary permissions in Salesloft

### "Error downloading recording"
- The recording URL may have expired or be inaccessible
- Check your network connection
