# Quick Start Guide

## 🚀 First Time Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up your API key**

   Make sure `.env` has:
   ```
   SALESLOFT_API_KEY=your_key_here
   GOOGLE_DRIVE_FOLDER_ID=your_folder_id
   ```

3. **Authenticate with Google Drive** (one-time)
   ```bash
   npm test
   ```
   Follow the OAuth prompts to authorize

---

## 📋 Daily Usage

### Test Mode (Quick Check)
Get 15 recent transcripts for testing:
```bash
npm test
```

**When to use:**
- Testing your setup
- Checking if new transcripts are available
- Verifying transcript quality
- Quick spot-check of recent calls

---

### Batch Mode (Production)
Get ALL available transcripts:
```bash
npm run batch
```

**When to use:**
- First-time full data extraction
- Getting all historical transcripts
- Scheduled daily/weekly syncs
- Adding net-new transcripts only

**Run multiple times to get everything:**
```bash
npm run batch  # Run 1: Finds 12 transcripts, processes 500 records
npm run batch  # Run 2: Finds 8 transcripts, processes next 500
npm run batch  # Run 3: Finds 5 transcripts, processes next 500
npm run batch  # Run 4: Finds 0 transcripts → You're done!
```

---

## 🎯 Common Workflows

### Workflow 1: Initial Full Extraction

**Goal:** Get all your historical call transcripts

```bash
# Run batch mode repeatedly until complete
npm run batch
# Wait for completion (2-5 minutes)

npm run batch
# Wait for completion

npm run batch
# Continue until you see "Found 0 new transcripts"
```

**Expected:**
- May take 5-15 runs depending on volume
- Automatically skips duplicates
- Safe to stop/restart anytime

---

### Workflow 2: Daily Sync

**Goal:** Keep transcripts up-to-date with new calls

**Option A: Manual Daily Run**
```bash
# Run once per day
npm run batch
```

**Option B: Scheduled (Cron - macOS/Linux)**
```bash
# Edit crontab
crontab -e

# Add daily run at 2 AM
0 2 * * * cd /path/to/gyde-transcripts && npm run batch >> logs/daily.log 2>&1
```

**Option C: Scheduled (Windows Task Scheduler)**
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily at 2 AM
4. Action: `node batch.js`
5. Start in: `C:\path\to\gyde-transcripts`

---

### Workflow 3: Spot Check Recent Calls

**Goal:** Quick check if recent calls have transcripts

```bash
npm test
```

View output:
- Shows if new transcripts are available
- Processes max 15 calls
- Fast (30-60 seconds)

---

## 📊 Understanding Output

### Test Mode Output:
```
╔═══════════════════════════════════════╗
║       🧪 TEST MODE - SALESLOFT        ║
║   Fetching limited transcripts...     ║
╚═══════════════════════════════════════╝

📋 Previously processed: 247 calls
🎯 MODE: Limited - Target 15 new AI transcripts

=== APPLYING SMART FILTERS ===
⏭️  Skipped 89 already processed calls
11 out of 100 records passed filters

=== FETCHING TRANSCRIPTS ===
[1/11] (Found: 0/15) Processing call ID: 474853988
  ✓ AI transcript available
  ✅ Retrieved 69 AI transcript sentences
  ✓ Saved locally: transcript_call_474853988_xxx.txt (✅ AI TRANSCRIPT)
    ✓ Uploaded to Google Drive

🎉 TARGET REACHED! Found 15 AI transcripts. Stopping.

=== SUMMARY ===
🎯 Target: 15 AI transcripts
✅ Found this run: 15 AI transcripts
📋 Total processed (all time): 262 calls
```

### Batch Mode Output:
```
╔═══════════════════════════════════════╗
║    📦 BATCH MODE - SALESLOFT          ║
║  Processing all available calls...    ║
║  (Auto-skips duplicates)              ║
╚═══════════════════════════════════════╝

📋 Previously processed: 1,247 calls
🎯 MODE: Unlimited - Process all available calls (scanning 500 records)

⏭️  Skipped 342 already processed calls
158 out of 500 records passed filters

=== FETCHING TRANSCRIPTS ===
[1/158] (Found: 0 AI transcripts) Processing call ID: 474853988
  ✓ AI transcript available
  ✅ Retrieved 69 AI transcript sentences
  ✓ Saved locally (✅ AI TRANSCRIPT)
    ✓ Uploaded to Google Drive

💾 Saved progress: 1,405 total calls processed

=== SUMMARY ===
✅ Found this run: 23 AI transcripts
📋 Total processed (all time): 1,405 calls

💡 Scanned 500 records. Run again to continue processing more calls.
```

---

## ✅ How to Verify It's Working

### Check 1: Local Files
```bash
ls -lh recordings/
```

Should see files like:
```
transcript_call_474853988_1731445892345.txt
transcript_call_474853370_1731445893456.txt
```

### Check 2: Google Drive
1. Open Google Drive in browser
2. Navigate to your folder (ID in .env)
3. See transcript files uploaded

### Check 3: Progress Tracking
```bash
cat processed_call_ids.json
```

Shows all processed call IDs:
```json
{
  "lastUpdated": "2025-11-12T21:30:00.000Z",
  "processedIds": ["474853988", "474853370", ...]
}
```

### Check 4: Sample Transcript Quality
```bash
head -20 recordings/transcript_call_474853988_*.txt
```

Should show:
```
=== CALL TRANSCRIPT ===
Call ID: 474853988
Date: 2025-11-12T20:47:16.422573Z
Duration: 375 seconds
From: +16024973078
To: +17029948137
...

[AI-GENERATED TRANSCRIPT - 69 sentences]

Hi, this is John calling from...
```

---

## 🛠️ Troubleshooting

### "Found 0 AI transcripts"

**Cause:** Recent calls might not have AI transcripts yet

**Solution:**
1. Wait 24-48 hours for Salesloft to process recordings
2. Run `npm run batch` again to scan more calls
3. Check Salesloft settings for transcription enablement

---

### "Already processed: 500 calls, Found: 0 new"

**Cause:** You've processed all available calls!

**Solution:**
✅ You're done! Wait for new calls, then run again.

---

### "Rate limit exceeded"

**Cause:** Too many API calls too fast

**Solution:** Edit `config.js`:
```javascript
batch: {
  API_DELAY_MS: 500,  // Slow down to 2 calls/sec
}
```

---

### "OAuth token expired"

**Cause:** Google Drive token needs refresh

**Solution:**
```bash
rm token.json
npm test  # Re-authorize
```

---

### "Want to reprocess everything"

**Cause:** Need to start fresh

**Solution:**
```bash
rm processed_call_ids.json
rm -rf recordings/
npm run batch
```

---

## 📞 Getting Help

1. Check [README.md](../README.md) for detailed docs
2. Check [BATCHING_GUIDE.md](./BATCHING_GUIDE.md) for advanced batching
3. Check [EXPLAINED.md](./EXPLAINED.md) for API technical details

---

## 🎓 Pro Tips

1. **Run batch mode during off-hours** to avoid Salesloft peak times
2. **Check processed_call_ids.json** to see total progress
3. **Back up recordings/** folder periodically
4. **Use test mode first** before running batch
5. **Monitor Google Drive quota** if processing thousands of calls
