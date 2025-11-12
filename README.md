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

1. Fetches call data records from Salesloft API (calls with dialer recordings)
2. For each call, fetches the transcript text from the dialer recording
3. Saves transcripts as text files in the `./recordings` folder
4. Provides progress feedback and a summary

## Output

- Files are saved to: `./recordings/`
- File naming format: `transcript_call_{callId}_{timestamp}.txt`
- Each file includes:
  - Call metadata (ID, date, duration, phone numbers)
  - Full transcript text
- The script processes 5 calls at a time by default (change `per_page` in index.js to adjust)

## After Download

Once the transcripts are downloaded to your computer, you can:
- Manually upload them to Google Drive
- Process them with text analysis tools
- Search through them for specific content
- Store them in your preferred location

## Notes

- The script only processes calls with dialer recordings that have transcripts
- Files are plain text (.txt format)
- The script will skip any calls without dialer recordings
- If a transcript fails to download, the script continues with the next one

## Troubleshooting

### "Error fetching transcripts"
- Verify your `SALESLOFT_API_KEY` is correct in the `.env` file
- Check that the API key has the necessary permissions in Salesloft

### "Error downloading recording"
- The recording URL may have expired or be inaccessible
- Check your network connection
