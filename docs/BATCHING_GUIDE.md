# Batching Guide: Processing All Call Transcripts

This guide explains how to efficiently process **all available call transcripts** from Salesloft.

---

## 🎯 Two Operating Modes

### Mode 1: Limited (Testing)
- **Purpose**: Get a specific number of AI transcripts for testing
- **Use case**: Initial testing, spot-checking recent calls
- **Configuration**: `MODE = 'limited'`

### Mode 2: Unlimited (Production)
- **Purpose**: Process all available calls with AI transcripts
- **Use case**: Full data extraction, ongoing sync
- **Configuration**: `MODE = 'unlimited'`

---

## 🚀 Quick Start: Get ALL Transcripts

### No Code Changes Required!

Simply run the batch script multiple times:

```bash
npm run batch
# Wait for it to complete (processes 500 records)

npm run batch
# Run again to process next batch (auto-skips duplicates)

npm run batch
# Keep running until "Found 0 new transcripts"
```

Each run will:
- ✅ Scan 500 call records
- ✅ Skip already-processed calls automatically
- ✅ Save progress after every 10 calls
- ✅ Upload new transcripts to Google Drive

---

## ⚙️ Configuration Settings

Edit `config.js` to adjust settings (no need to modify main scripts):

```javascript
// Test mode (npm test)
test: {
  TARGET_AI_TRANSCRIPTS: 15,
  MAX_RECORDS_TO_SCAN: 100,
  MIN_DURATION: 30,
  API_DELAY_MS: 100,
}

// Batch mode (npm run batch)
batch: {
  MAX_RECORDS_TO_SCAN: 500,  // Records per run
  MIN_DURATION: 30,           // Minimum call duration (seconds)
  API_DELAY_MS: 100,          // Delay between API calls
}
```

### Recommended Settings for Full Extraction:

**Conservative (Safer for API limits):**
```javascript
const MAX_RECORDS_TO_SCAN = 200;
const API_DELAY_MS = 200; // 5 calls/sec
```

**Aggressive (Faster, may hit rate limits):**
```javascript
const MAX_RECORDS_TO_SCAN = 1000;
const API_DELAY_MS = 50; // 20 calls/sec
```

---

## 📊 Duplicate Prevention

The script automatically tracks processed calls in `processed_call_ids.json`:

```json
{
  "lastUpdated": "2025-11-12T21:30:00.000Z",
  "processedIds": [
    "474853988",
    "474853370",
    "474843137"
  ]
}
```

### How It Works:

1. ✅ **First run**: Processes 500 records, finds 8 AI transcripts
2. ✅ **Second run**: Skips those 500, processes next 500 records
3. ✅ **Third run**: Continues from where it left off
4. ✅ **Safe to stop/restart**: Progress is saved every 10 calls

### Reset Tracking (Start Fresh):

```bash
rm processed_call_ids.json
```

---

## 📈 Example: Processing 5,000 Calls

### Scenario:
- Total calls in Salesloft: **5,000**
- Calls with AI transcripts: **~300** (6% conversion rate)
- Desired: Extract all 300 AI transcripts

### Strategy:

**Option A: Automatic Batching (Recommended)**

```javascript
// Set in index.js
const MODE = 'unlimited';
const MAX_RECORDS_TO_SCAN = 500;
```

Run script **10 times**:
```bash
npm start  # Run 1: Scans calls 1-500, finds ~30 transcripts
npm start  # Run 2: Scans calls 501-1000, finds ~30 transcripts
npm start  # Run 3: Scans calls 1001-1500, finds ~30 transcripts
...
npm start  # Run 10: Scans calls 4501-5000, finds ~30 transcripts
```

**Total time**: ~30-60 minutes (with 100ms delays)

**Option B: Single Large Batch**

```javascript
const MAX_RECORDS_TO_SCAN = 5000;
```

Run script **once**:
```bash
npm start  # Single run: Scans all 5000 calls
```

**Total time**: ~2-3 hours (with 100ms delays)

⚠️ **Risk**: If interrupted, must restart from beginning (unless progress was saved)

---

## 🔄 Scheduling for Continuous Sync

### Daily Sync (macOS/Linux):

Create a cron job to run daily:

```bash
crontab -e
```

Add:
```cron
# Run daily at 2 AM
0 2 * * * cd /Users/proc/Documents/Repos/gyde-transcripts && npm start >> logs/daily_sync.log 2>&1
```

### Weekly Sync (Windows Task Scheduler):

1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Weekly
4. Action: Start a program
5. Program: `node`
6. Arguments: `index.js`
7. Start in: `C:\path\to\gyde-transcripts`

---

## 📁 Output Organization

### Files Created:

```
recordings/
├── transcript_call_474853988_1731445892345.txt  (✅ AI Transcript)
├── transcript_call_474853370_1731445893456.txt  (✅ AI Transcript)
└── transcript_call_474843137_1731445894567.txt  (✅ AI Transcript)

processed_call_ids.json  (Progress tracker - don't delete!)
```

### Google Drive:

All files are automatically uploaded to:
```
Google Drive Folder ID: 1Xi4wJIa53MnbPbJP57xhZvlGmFkkL6gi
```

---

## 🛠️ Troubleshooting

### "Only found 0 transcripts after scanning 500 records"

**Cause**: Recent calls may not have AI transcripts generated yet.

**Solution**:
- Wait 24-48 hours for Salesloft to process recordings
- Or scan older date ranges

### "Rate limit exceeded"

**Cause**: Too many API calls too quickly.

**Solution**: Increase `API_DELAY_MS`:
```javascript
const API_DELAY_MS = 500; // Slow down to 2 calls/sec
```

### "Script crashed mid-run"

**Cause**: Network error, API timeout, etc.

**Solution**: Just run again!
```bash
npm start  # Automatically resumes from last saved progress
```

Progress is saved every 10 calls, so you'll only lose up to 9 calls of work.

### "Want to reprocess failed calls"

**Solution**: Remove specific IDs from `processed_call_ids.json`:

```javascript
// Edit processed_call_ids.json
{
  "processedIds": [
    "474853988",
    // "474853370",  // Remove this line to reprocess
    "474843137"
  ]
}
```

---

## 📊 Monitoring Progress

### Console Output:

```
🎯 MODE: Unlimited - Process all available calls (scanning 500 records)
📋 Previously processed: 1,247 calls

=== APPLYING SMART FILTERS ===
⏭️  Skipped 342 already processed calls
158 out of 500 records passed filters

=== FETCHING TRANSCRIPTS ===
[1/158] (Found: 0 AI transcripts) Processing call ID: 474853988
  ✓ AI transcript available
  ✅ Retrieved 69 AI transcript sentences
  ✓ Saved locally: transcript_call_474853988_xxx.txt (✅ AI TRANSCRIPT)
    ✓ Uploaded to Google Drive

...

💾 Saved progress: 1,405 total calls processed

=== SUMMARY ===
✅ Found this run: 12 AI transcripts
📋 Total processed (all time): 1,405 calls
```

---

## 🎯 Best Practices

### For Initial Full Extraction:

1. **Start with limited mode** to test:
   ```javascript
   const MODE = 'limited';
   const TARGET_AI_TRANSCRIPTS = 15;
   ```

2. **Switch to unlimited mode**:
   ```javascript
   const MODE = 'unlimited';
   const MAX_RECORDS_TO_SCAN = 500;
   ```

3. **Run in batches** (every few hours/days):
   ```bash
   npm start  # Batch 1
   # Wait a few hours
   npm start  # Batch 2
   # Repeat until complete
   ```

4. **Monitor Google Drive** to verify uploads

### For Ongoing Sync:

1. **Set unlimited mode with moderate batch size**:
   ```javascript
   const MODE = 'unlimited';
   const MAX_RECORDS_TO_SCAN = 200;
   ```

2. **Schedule daily runs** (cron/Task Scheduler)

3. **Review summary emails/logs** weekly

---

## 🔍 Estimating Total Runtime

**Formula**:
```
Time = (Total Calls × API_DELAY_MS) / 1000 / 60 minutes
```

**Examples**:

| Total Calls | Delay (ms) | Estimated Time |
|-------------|-----------|----------------|
| 500         | 100       | ~1 minute      |
| 1,000       | 100       | ~2 minutes     |
| 5,000       | 100       | ~8 minutes     |
| 10,000      | 100       | ~17 minutes    |
| 5,000       | 500       | ~42 minutes    |

*Note: Actual time includes API response time (~200-500ms per call)*

---

## ✅ Verification

To verify everything is working:

1. Check local files:
   ```bash
   ls -l recordings/
   ```

2. Check Google Drive folder (via web browser)

3. Check processed IDs count:
   ```bash
   cat processed_call_ids.json | grep "processedIds" | wc -l
   ```

4. Sample a few transcript files to verify content quality

---

## 📞 Support

If you encounter issues:

1. Check `debug_response.json` for API response structure
2. Verify `.env` has correct `SALESLOFT_API_KEY`
3. Ensure Google Drive OAuth token is valid (`token.json`)
4. Review console output for specific error messages
