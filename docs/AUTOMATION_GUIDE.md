# Automation Guide - Weekly Transcript Pipeline

This guide shows you how to automate the entire transcript processing pipeline to run weekly (or daily).

---

## What Gets Automated

The automation runs this complete workflow:

1. **Fetch new transcripts** from SalesLoft API
2. **Upload to Google Drive** (auto-creates files)
3. **Create Salesforce import CSV** with:
   - All transcript metadata
   - Matched Contact/Account names
   - Google Drive URLs
   - Match status indicators

**Safe to run multiple times:** The system tracks which transcripts have been processed, so it only processes NEW ones each time.

---

## Quick Start - Manual Weekly Run

**Run this command once a week:**

```bash
npm run weekly-update
```

This runs the full pipeline and outputs:
- Updated `data/salesforce_import_ready.csv`
- Summary of new transcripts found
- Next steps for Salesforce import

**That's it!** You can then import the updated CSV to Salesforce.

---

## Option 1: Mac/Linux - Cron Job (Recommended)

**Runs automatically every week without you doing anything.**

### Step 1: Make the script executable

```bash
chmod +x scripts/weekly-automation.js
```

### Step 2: Open your crontab

```bash
crontab -e
```

### Step 3: Add one of these schedules

**Every Monday at 9 AM:**
```bash
0 9 * * 1 cd /Users/proc/Documents/Repos/gyde-transcripts && /usr/local/bin/node scripts/weekly-automation.js >> logs/automation.log 2>&1
```

**Every Friday at 5 PM:**
```bash
0 17 * * 5 cd /Users/proc/Documents/Repos/gyde-transcripts && /usr/local/bin/node scripts/weekly-automation.js >> logs/automation.log 2>&1
```

**Every day at 8 AM:**
```bash
0 8 * * * cd /Users/proc/Documents/Repos/gyde-transcripts && /usr/local/bin/node scripts/weekly-automation.js >> logs/automation.log 2>&1
```

### Step 4: Create logs directory

```bash
mkdir -p logs
```

### Step 5: Verify it's scheduled

```bash
crontab -l
```

### Check the logs anytime:

```bash
tail -f logs/automation.log
```

---

## Option 2: Windows - Task Scheduler

### Step 1: Open Task Scheduler

1. Press `Win + R`
2. Type: `taskschd.msc`
3. Press Enter

### Step 2: Create Basic Task

1. Click **"Create Basic Task"** (right sidebar)
2. **Name:** `Weekly Transcript Sync`
3. **Description:** `Automatically fetch and process call transcripts`
4. Click **Next**

### Step 3: Set Schedule

1. **Trigger:** Select `Weekly`
2. Click **Next**
3. **Start date:** Today
4. **Start time:** `9:00 AM`
5. **Recur every:** `1 week`
6. **Select days:** Check `Monday` (or your preferred day)
7. Click **Next**

### Step 4: Set Action

1. **Action:** Select `Start a program`
2. Click **Next**
3. **Program/script:** `node`
4. **Add arguments:** `scripts/weekly-automation.js`
5. **Start in:** `C:\Users\YourName\Documents\Repos\gyde-transcripts`
6. Click **Next**

### Step 5: Finish

1. Check **"Open the Properties dialog"**
2. Click **Finish**
3. In Properties:
   - Go to **Settings** tab
   - Uncheck **"Stop the task if it runs longer than"**
   - Click **OK**

---

## Option 3: GitHub Actions (Cloud-based)

**Runs in the cloud, no need for your computer to be on.**

### Step 1: Create workflow file

Create `.github/workflows/weekly-sync.yml`:

```yaml
name: Weekly Transcript Sync

on:
  schedule:
    # Runs every Monday at 9 AM UTC
    - cron: '0 9 * * 1'
  workflow_dispatch: # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run weekly automation
        env:
          SALESLOFT_API_KEY: ${{ secrets.SALESLOFT_API_KEY }}
          GOOGLE_DRIVE_FOLDER_ID: ${{ secrets.GOOGLE_DRIVE_FOLDER_ID }}
        run: npm run weekly-update

      - name: Commit updated CSV
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add data/salesforce_import_ready.csv
          git commit -m "chore: update Salesforce import CSV [automated]" || echo "No changes"
          git push
```

### Step 2: Add secrets to GitHub

1. Go to your repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add:
   - `SALESLOFT_API_KEY` (your SalesLoft API key)
   - `GOOGLE_DRIVE_FOLDER_ID` (your Google Drive folder ID)

### Step 3: Enable workflow

Push the workflow file to GitHub and it will run automatically every Monday.

---

## Verification Commands

**Check data quality before importing:**
```bash
npm run verify-import
```

**See which IDs match Salesforce:**
```bash
npm run salesforce-check
```

**View the final CSV:**
```bash
open data/salesforce_import_ready.csv
```

---

## What Happens Each Week

### Automated Process:

1. ✅ Script runs at scheduled time
2. ✅ Fetches new call transcripts from SalesLoft
3. ✅ Uploads new transcripts to Google Drive
4. ✅ Updates `salesforce_import_ready.csv` with all transcripts (old + new)
5. ✅ Logs results

### What You Do:

**Option A: Import new records only**
1. Open the CSV
2. Filter by recent dates (last 7 days)
3. Import just those rows to Salesforce

**Option B: Replace all records**
1. Delete old Call Transcript records in Salesforce
2. Import the entire updated CSV

**Option C: Do nothing**
- The CSV is always up-to-date and ready when you need it

---

## Monitoring & Notifications

### Email Notifications (Future Enhancement)

Want to get emailed when new transcripts are ready? Add this to `weekly-automation.js`:

```javascript
// After the automation completes, send email
if (newTranscripts > 0) {
  // Use nodemailer or similar to send email
  console.log(`Sending email: ${newTranscripts} new transcripts ready`);
}
```

### Slack Notifications (Future Enhancement)

Post to Slack when automation runs:

```bash
npm install @slack/webhook
```

Then add webhook call in `weekly-automation.js`.

---

## Troubleshooting

### Cron job not running?

**Check if cron is running:**
```bash
ps aux | grep cron
```

**Check cron logs:**
```bash
tail -f /var/log/syslog | grep CRON  # Linux
tail -f /var/log/system.log | grep cron  # Mac
```

**Common issues:**
- Wrong path to node: Find it with `which node`
- Permissions: Make sure script is executable
- Environment variables: Add to crontab with `ENV_VAR=value`

### No new transcripts found?

This is normal if:
- No new calls were made this week
- All calls were already processed
- Check `data/processed_conversation_ids.json` to see what's been processed

### Google Drive authorization expired?

Re-run the authorization:
```bash
npm start
```

Follow the OAuth flow to get a new token.

---

## Advanced: Incremental Salesforce Imports

Instead of importing the entire CSV each week, you can import only NEW records.

### Step 1: Track last import date

Create `data/last_import.json`:
```json
{
  "lastImportDate": "2025-11-15"
}
```

### Step 2: Filter CSV by date

```bash
# In Excel or Google Sheets:
# 1. Open salesforce_import_ready.csv
# 2. Filter Date column > Last Import Date
# 3. Save as: salesforce_import_incremental.csv
# 4. Import just this file
```

### Step 3: Update last import date

After successful import, update `last_import.json` with today's date.

---

## Cost & Performance

**API Calls:**
- SalesLoft API: ~10-50 calls per run (depends on new transcripts)
- Google Drive API: 1 call per new transcript

**Runtime:**
- Typically: 1-5 minutes
- With 50 new transcripts: ~10 minutes

**Storage:**
- CSV file: ~50 KB per 100 transcripts
- Google Drive: ~5 KB per transcript

---

## Summary

### Recommended Setup:

1. **Run manually first** to test:
   ```bash
   npm run weekly-update
   ```

2. **Set up cron job** (Mac/Linux) or **Task Scheduler** (Windows)

3. **Check logs** after first automated run

4. **Import to Salesforce** weekly or as needed

### Commands Reference:

| Command | What It Does |
|---------|--------------|
| `npm run weekly-update` | Full pipeline: Fetch → Process → Create CSV |
| `npm run verify-import` | Check data quality and duplicates |
| `npm run salesforce-check` | Verify ID matches with Salesforce |
| `npm run create-import-csv` | Just rebuild the CSV (no fetching) |

---

## Questions?

**"How often should I run this?"**
- Weekly is good for most teams (50-100 calls/week)
- Daily if you have high call volume (100+ calls/day)

**"What if I miss a week?"**
- No problem! Next run will catch up and process all new transcripts

**"Can I run this manually too?"**
- Yes! `npm run weekly-update` works anytime

**"Will this overwrite my existing data?"**
- No. The CSV is regenerated each time, but old transcripts stay (it's cumulative)

**"What if Google Drive authorization expires?"**
- Re-run `npm start` to re-authorize
- Or set up a service account for long-term access

---

🎉 **You're all set!**

Your transcript pipeline is now automated and will keep your Salesforce data fresh with minimal effort.
