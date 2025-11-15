# Next Steps & Known Issues

## 🚀 START HERE - When You Resume Work

**Last Session:** 2025-11-12
**Status:** Successfully downloaded 34 phone call transcripts, duplicate prevention verified working

**Your Next Tasks (In Order):**
1. **Add Video Meeting Support** - Currently only getting phone calls, need to add video meetings (Zoom, Teams, etc.)
2. **Deploy to Render** - Set up automated cron job to run every 24 hours or weekly
3. **Test & Monitor** - Verify automated runs are working correctly

**What's Working:**
- ✅ Phone call transcript extraction (34 transcripts)
- ✅ Duplicate prevention (tested and verified)
- ✅ Pagination and state management
- ✅ Google Drive upload

**What's Missing:**
- ⚠️ Video meeting transcripts (Zoom, Teams, etc.) - **THIS IS YOUR NEXT PRIORITY**

---

## Current Status
- ✅ Successfully fetching **phone call transcripts** from Salesloft
- ✅ Duplicate prevention working correctly
- ✅ Pagination and state management functional
- ⚠️ **Only 34 AI transcripts found** - likely missing video meetings

## Known Limitation: Phone Calls Only

### Issue Discovered (2025-11-12)
The current implementation only fetches transcripts from **phone calls** via the `/call_data_records.json` endpoint.

**What's Missing:**
- Video meeting transcripts (Zoom, Teams, Google Meet, etc.)
- Other conversation types that may have AI transcripts

### Why This Happened
The script uses:
```javascript
// index.js:77
axios.get(`${SALESLOFT_API_URL}/call_data_records.json`, {
  params: { has_recording: true }
})
```

This endpoint only returns **phone call** data records, not video meetings or other conversation types.

### Evidence
- Total conversations API returned: ~1200+ conversations (based on pagination)
- Total AI transcripts saved: 34 (only phone calls)
- Skipped conversations: ~268+ per batch (no AI transcript or already processed)

---

## TODO: Add Video Meeting Support

### Why Change the API Endpoint?

**Current:** Uses `call_data_records.json` → Only returns phone calls
**Problem:** Missing video meeting transcripts (Zoom, Teams, Google Meet, etc.)
**Solution:** Use `conversations.json` → Returns ALL conversation types

### Required Changes

1. **Switch to Conversations Endpoint**
   ```javascript
   // OLD (index.js:77)
   axios.get(`${SALESLOFT_API_URL}/call_data_records.json`, {
     params: { has_recording: true }
   })

   // NEW
   axios.get(`${SALESLOFT_API_URL}/conversations.json`, {
     params: { per_page: 100 }
   })
   ```

2. **Filter by Transcription Existence**
   ```javascript
   // Only process conversations that have transcriptions
   const recordsToProcess = conversations.filter(conv =>
     conv.transcription && conv.transcription.id
   );
   ```

3. **Track Media Type**
   ```javascript
   // Add to saved transcript files
   content += `Media Type: ${conversation.media_type || 'unknown'}\n`;
   content += `Platform: ${conversation.platform || 'unknown'}\n`;
   ```

### API Investigation Needed
- [ ] Query `/conversations.json` and check `media_type` field values
- [ ] Verify video meetings have `transcription_id` populated
- [ ] Test fetching sentences for video meeting transcriptions
- [ ] Check if different platforms (Zoom/Teams/etc.) require different handling

### Example Query to Test
```bash
curl -H "Authorization: Bearer $SALESLOFT_API_KEY" \
  "https://api.salesloft.com/v2/conversations.json?per_page=5" \
  | jq '.data[] | {media_type, platform, has_transcription: .transcription.id}'
```

---

## Recommended Cleanup Items

### 1. Remove Debug Files
```bash
# These files are regenerated on each run
rm debug_response.json
rm debug_conversation.json
```

### 2. Add `.gitignore` Entries
```gitignore
# Add to .gitignore
debug_*.json
recordings/
processed_call_ids.json
backups/
token.json
oauth_credentials.json
.env
```

### 3. Create Stats/Validation Script
Add a script to verify what's been downloaded:
```javascript
// verify.js - Already exists! Good.
// Could enhance with:
// - Count by media type (phone vs video)
// - List calls without transcripts
// - Summary by date range
```

### 4. Add Better Logging
Consider adding a log file that tracks:
- Run timestamp
- Records scanned
- Transcripts found
- Errors encountered
- Media type breakdown

---

## Production Readiness Checklist

- [x] Duplicate prevention working
- [x] Pagination state management
- [x] Progress saving (every 10 calls)
- [x] Auto-backup of tracking file
- [ ] **Video meeting support** (HIGH PRIORITY)
- [ ] Error handling for API rate limits
- [ ] Retry logic for failed API calls
- [ ] Better logging/audit trail
- [ ] Stats dashboard or summary report

---

## How to Resume Work

### When Adding Video Meeting Support:

1. **Test the hypothesis**
   ```bash
   npm run verify  # Check current state
   ```

2. **Investigate API**
   - Check what `media_type` values exist in your Salesloft conversations
   - Confirm video meetings have `transcription.id`

3. **Modify `index.js`**
   - Change primary data source from `call_data_records` to `conversations`
   - Remove filters that limit to phone calls only
   - Add `media_type` tracking to saved files

4. **Test incrementally**
   ```bash
   npm test  # Test with limited records first
   ```

5. **Run full batch**
   ```bash
   npm run batch  # Process all conversations
   ```

### Files to Modify
- `index.js` - Main fetching logic (lines 67-125)
- `config.js` - Potentially add media_type filters
- `verify.js` - Add media type stats

---

## Notes for Future You

**Don't forget:** The current setup is working perfectly for phone calls! When you add video support:
- Keep the same duplicate prevention logic (it's solid)
- Keep the pagination strategy (it works)
- Just change the data source from `call_data_records` to `conversations`
- Test with `npm test` before running full batch

The architecture is good - you just need to widen the net to catch video meetings too!

---

## Deploy to Render with Automated Cron Jobs

### Goal
Run the transcript extraction automatically every 24 hours (or weekly) without manual intervention.

### Setup Steps

#### 1. **Prepare the Repository**

Add a `render.yaml` file to the root:
```yaml
services:
  - type: cron
    name: gyde-transcripts-sync
    env: node
    plan: free
    schedule: "0 0 * * *"  # Run daily at midnight UTC
    buildCommand: npm install
    startCommand: npm run batch
    envVars:
      - key: SALESLOFT_API_KEY
        sync: false
      - key: GOOGLE_DRIVE_FOLDER_ID
        sync: false
```

**Alternative schedules:**
- `0 0 * * *` - Daily at midnight
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 */6 * * *` - Every 6 hours

#### 2. **Create Entry Point Script**

Create `render-sync.js`:
```javascript
#!/usr/bin/env node

import { main } from './index.js';
import { getConfig } from './config.js';

console.log('🤖 Automated Render Sync Starting...');
console.log('Timestamp:', new Date().toISOString());

const config = getConfig('batch');

main(config)
  .then(() => {
    console.log('✅ Sync completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  });
```

Update `package.json`:
```json
{
  "scripts": {
    "start": "node index.js",
    "test": "node test.js",
    "batch": "node batch.js",
    "sync": "node render-sync.js",
    "clean": "node clean.js",
    "verify": "node verify.js"
  }
}
```

#### 3. **Handle Google OAuth on Render**

**Problem:** OAuth requires browser interaction for first-time auth
**Solution:** Pre-authenticate locally, then upload token

```bash
# 1. Run locally to generate token
npm run batch

# 2. Check that token.json was created
ls -la token.json

# 3. Add token.json contents as environment variable on Render
# In Render dashboard: Add env var GOOGLE_OAUTH_TOKEN
# Value: Copy entire contents of token.json
```

Update `index.js` to check for env var:
```javascript
async function authorizeGoogleDrive() {
  try {
    const credentials = JSON.parse(fs.readFileSync(OAUTH_CREDENTIALS_PATH, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check for token from environment variable (for Render)
    if (process.env.GOOGLE_OAUTH_TOKEN) {
      const token = JSON.parse(process.env.GOOGLE_OAUTH_TOKEN);
      oAuth2Client.setCredentials(token);
      return oAuth2Client;
    }

    // Check for local token file
    if (fs.existsSync(TOKEN_PATH)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      oAuth2Client.setCredentials(token);
      return oAuth2Client;
    }

    // ... existing authorization code ...
  }
}
```

#### 4. **Deploy to Render**

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add Render deployment config"
   git push origin main
   ```

2. **Create Render Account**
   - Go to https://render.com
   - Sign up / Sign in with GitHub

3. **Create New Cron Job**
   - Dashboard → New → Cron Job
   - Connect your GitHub repo
   - Render will auto-detect `render.yaml`
   - Add environment variables:
     - `SALESLOFT_API_KEY` = your API key
     - `GOOGLE_DRIVE_FOLDER_ID` = your folder ID
     - `GOOGLE_OAUTH_TOKEN` = contents of token.json

4. **Enable Persistent Storage** (Important!)
   - Render cron jobs are stateless by default
   - Need to persist `processed_call_ids.json` between runs
   - In Render dashboard:
     - Add Disk: `/opt/render/project/src/data`
     - Update paths in code to use `/opt/render/project/src/data/processed_call_ids.json`

#### 5. **Update File Paths for Persistence**

Create `paths.js`:
```javascript
import path from 'path';

// Use persistent disk on Render, local folder otherwise
const DATA_DIR = process.env.RENDER
  ? '/opt/render/project/src/data'
  : './';

export const PATHS = {
  PROCESSED_IDS: path.join(DATA_DIR, 'processed_call_ids.json'),
  RECORDINGS: path.join(DATA_DIR, 'recordings'),
  BACKUPS: path.join(DATA_DIR, 'backups')
};
```

Update `index.js` to import and use these paths.

#### 6. **Add Monitoring & Notifications**

**Option A: Email notifications**
Add to `render-sync.js`:
```javascript
import nodemailer from 'nodemailer';

async function sendNotification(stats) {
  // Configure email service (SendGrid, Gmail, etc.)
  // Send summary of run
}
```

**Option B: Slack webhook**
```javascript
async function notifySlack(message) {
  await axios.post(process.env.SLACK_WEBHOOK_URL, {
    text: message
  });
}
```

**Option C: Use Render logs**
- Render keeps logs of all cron runs
- Check dashboard for run history and errors

### Testing Deployment

```bash
# 1. Test the sync command locally
npm run sync

# 2. Verify it creates/updates processed_call_ids.json
cat processed_call_ids.json

# 3. Run again to verify no duplicates
npm run sync

# 4. Check file count
ls -la recordings/ | wc -l
```

### Post-Deployment Checklist

- [ ] Cron job created on Render
- [ ] Environment variables set
- [ ] Persistent disk configured
- [ ] OAuth token working
- [ ] Test run successful (check Render logs)
- [ ] Verify files uploading to Google Drive
- [ ] Monitor for 1 week to ensure stability
- [ ] Set up alerts for failures (optional)

### Troubleshooting Render

**Issue: Token expired**
- Regenerate locally
- Update `GOOGLE_OAUTH_TOKEN` env var on Render

**Issue: Disk full**
- Recordings are uploaded to Google Drive, safe to delete locally
- Add cleanup step to `render-sync.js`

**Issue: Rate limiting**
- Salesloft API has rate limits
- Adjust `API_DELAY_MS` in config
- Consider running less frequently (weekly instead of daily)

### Cost Estimate
- **Render Free Tier:** 750 hours/month of cron jobs (enough for daily runs)
- **Google Drive:** Free (15GB storage)
- **Total Cost:** $0/month for moderate usage

---

## Alternative: GitHub Actions (Optional)

If you prefer not to use Render, you can use GitHub Actions:

```yaml
# .github/workflows/sync-transcripts.yml
name: Sync Salesloft Transcripts

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
  workflow_dispatch:  # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run sync
        env:
          SALESLOFT_API_KEY: ${{ secrets.SALESLOFT_API_KEY }}
          GOOGLE_DRIVE_FOLDER_ID: ${{ secrets.GOOGLE_DRIVE_FOLDER_ID }}
          GOOGLE_OAUTH_TOKEN: ${{ secrets.GOOGLE_OAUTH_TOKEN }}
```

**Pros:** Free, integrated with GitHub, easy to set up
**Cons:** No persistent storage (would need to download/upload processed_call_ids.json to/from GitHub repo)
