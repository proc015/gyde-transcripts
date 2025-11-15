# Next Steps: Production Deployment

This document outlines the roadmap to transform this local script into a fully automated production system.

---

## 🎯 Current Status

✅ **What's Working:**
- Local test mode (`npm test`) - Gets 15 transcripts
- Local batch mode (`npm run batch`) - Gets unlimited transcripts
- Duplicate prevention via `processed_call_ids.json`
- Google Drive OAuth integration
- Complete AI transcript extraction with pagination
- Comprehensive documentation

⚠️ **What's Needed:**
- Automated scheduled runs (cron job)
- Cloud deployment (Render)
- Production-ready error handling
- Monitoring and alerts

---

## 📋 Roadmap

### Phase 1: Manual Process Verification ✅ (Complete This First)

**Goal:** Ensure the manual batch process reliably gets ALL transcripts before automating.

#### Tasks:

**1. Full Historical Backfill**
```bash
# Run batch mode until you have all historical transcripts
npm run batch
npm run batch
npm run batch
# ... continue until "Found 0 new transcripts"
```

**Verify:**
- [ ] Ran batch mode multiple times
- [ ] Summary shows "Found 0 new transcripts"
- [ ] `processed_call_ids.json` has substantial count (100s or 1000s)
- [ ] Google Drive folder has all transcript files
- [ ] Spot-checked 5-10 transcripts for quality

**Success Criteria:**
```
=== SUMMARY ===
✅ Found this run: 0 AI transcripts
📋 Total processed (all time): 2,847 calls
⏭️  Skipped 500 already processed calls
```

---

**2. Test Daily Incremental Updates**

Wait 24 hours after full backfill, then:
```bash
npm run batch
```

**Verify:**
- [ ] Only processes new calls from past 24 hours
- [ ] Skips all previously processed calls
- [ ] Finds 0-20 new transcripts (depending on call volume)
- [ ] Takes < 5 minutes
- [ ] All new files uploaded to Google Drive

**Success Criteria:**
```
⏭️  Skipped 2,847 already processed calls  ← Most calls skipped
✅ Found this run: 8 AI transcripts         ← Only new ones
```

---

**3. Document Your Manual Process**

Create a simple checklist for running manually:

**Daily Manual Run Checklist:**
```
□ Open terminal
□ Navigate to project: cd /path/to/gyde-transcripts
□ Run batch: npm run batch
□ Wait for completion (2-5 minutes)
□ Verify Google Drive uploads
□ Note transcript count in log/spreadsheet
```

---

### Phase 2: Prepare for Render Deployment

**Goal:** Make the script cloud-ready and configure for automated runs.

#### Tasks:

**1. Create Render-Specific Configuration**

Create `render.yaml`:
```yaml
services:
  - type: cron
    name: salesloft-transcript-sync
    env: node
    buildCommand: npm install
    startCommand: npm run batch
    schedule: "0 2 * * *"  # Daily at 2 AM UTC
    envVars:
      - key: SALESLOFT_API_KEY
        sync: false
      - key: GOOGLE_DRIVE_FOLDER_ID
        sync: false
```

**2. Update for Stateless Deployment**

Since Render cron jobs are stateless, we need to store `processed_call_ids.json` remotely.

**Options:**
- **Option A:** Store in Google Drive (recommended)
- **Option B:** Use Render's persistent disk
- **Option C:** Use external database (Postgres/MongoDB)

**Recommended: Store tracking file in Google Drive**

Create `lib/storage.js`:
```javascript
// Download processed_call_ids.json from Google Drive at start
// Upload processed_call_ids.json to Google Drive at end
```

**3. Add Error Handling & Notifications**

Create `lib/notifications.js`:
```javascript
// Send email/Slack notification on:
// - Successful run (daily summary)
// - Errors/failures
// - No transcripts found for 7 days (warning)
```

**4. Add Logging**

Replace `console.log` with proper logging:
```javascript
import winston from 'winston';

// Log to file + console
// Retain last 30 days of logs
```

---

### Phase 3: Deploy to Render

**Goal:** Get the automated cron job running on Render.

#### Prerequisites:

- [ ] Render account created (free tier works)
- [ ] GitHub repo created (optional but recommended)
- [ ] Environment variables documented

#### Tasks:

**1. Create Render Cron Job**

Via Render Dashboard:
1. New → Cron Job
2. Connect GitHub repo (or upload manually)
3. Environment: Node
4. Build command: `npm install`
5. Start command: `npm run batch`
6. Schedule: `0 2 * * *` (daily 2 AM)

**2. Configure Environment Variables**

In Render dashboard, add:
```
SALESLOFT_API_KEY=v2_ak_...
GOOGLE_DRIVE_FOLDER_ID=1Xi4wJ...
```

**3. Handle Google OAuth on Render**

**Challenge:** OAuth requires interactive browser login.

**Solutions:**

**Option A: Pre-authenticate locally, upload token**
```bash
# Run locally first to get token.json
npm test
# Upload token.json contents as env var TOKEN_JSON in Render
```

**Option B: Use Service Account (if possible)**
- Create Google Cloud Service Account
- Share Drive folder with service account email
- Use service account credentials instead of OAuth

**Option C: Refresh token approach**
- Get refresh token locally
- Store as env var
- Script regenerates access tokens automatically

**Recommended: Option A for simplicity**

---

**4. Test Render Deployment**

**Manual test:**
1. Deploy to Render
2. Trigger manual run from Render dashboard
3. Check logs for success
4. Verify Google Drive uploads
5. Check `processed_call_ids.json` updated

**Cron test:**
1. Set schedule to run every hour temporarily: `0 * * * *`
2. Wait for automatic run
3. Verify it ran successfully
4. Reset to daily schedule: `0 2 * * *`

---

### Phase 4: Monitoring & Maintenance

**Goal:** Ensure long-term reliability and visibility.

#### Tasks:

**1. Set Up Monitoring Dashboard**

Track:
- ✅ Daily runs completed
- ✅ Number of new transcripts per day
- ✅ Total transcripts processed
- ⚠️ Failed runs
- ⚠️ API errors
- ⚠️ Google Drive quota warnings

**Tools:**
- Render dashboard (basic)
- Google Sheets (log daily stats)
- Datadog/New Relic (advanced)

**2. Create Alerts**

Alert when:
- ❌ Cron job fails to run
- ❌ No transcripts found for 7 consecutive days
- ⚠️ API rate limit exceeded
- ⚠️ Google Drive storage > 90%

**3. Weekly Review Process**

Every Monday:
- [ ] Review past week's transcript counts
- [ ] Check for any failed runs
- [ ] Spot-check 2-3 recent transcripts for quality
- [ ] Review Google Drive folder organization

**4. Monthly Maintenance**

Every month:
- [ ] Review and archive old transcripts (if needed)
- [ ] Check Google Drive storage usage
- [ ] Update dependencies: `npm outdated`
- [ ] Review processed_call_ids.json size

---

## 🚀 Quick Start Guide (After Manual Testing)

Once Phase 1 is complete:

### Deploy to Render (10 minutes)

**Step 1: Prepare Environment Variables**
```bash
# Get these values from your local .env
cat .env

# Get your OAuth token
cat token.json
```

**Step 2: Create Render Cron Job**
1. Go to https://render.com
2. New → Cron Job
3. Name: `salesloft-transcript-sync`
4. Environment: `Node`
5. Build Command: `npm install`
6. Start Command: `npm run batch`
7. Schedule: `0 2 * * *`

**Step 3: Add Environment Variables**
```
SALESLOFT_API_KEY = <from .env>
GOOGLE_DRIVE_FOLDER_ID = <from .env>
TOKEN_JSON = <contents of token.json>
```

**Step 4: Update Code for Render**

Edit `index.js` to load token from env var:
```javascript
// At top of authorizeGoogleDrive()
if (process.env.TOKEN_JSON) {
  const token = JSON.parse(process.env.TOKEN_JSON);
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}
```

**Step 5: Deploy & Test**
1. Push code to GitHub (or upload)
2. Render auto-deploys
3. Click "Trigger Run" for manual test
4. Check logs
5. Verify Google Drive

---

## 📊 Success Metrics

### Phase 1 (Manual) - Week 1
- [ ] Processed 100% of historical calls
- [ ] 0 duplicate transcripts
- [ ] Successfully ran daily sync 7 days in a row
- [ ] < 5% error rate

### Phase 2 (Prepare) - Week 2
- [ ] render.yaml created
- [ ] Storage solution implemented
- [ ] Error handling added
- [ ] Notifications configured

### Phase 3 (Deploy) - Week 3
- [ ] Successfully deployed to Render
- [ ] Cron job running daily
- [ ] 100% success rate for 7 days
- [ ] All transcripts uploading to Drive

### Phase 4 (Monitor) - Ongoing
- [ ] Dashboard showing daily metrics
- [ ] Alerts configured and tested
- [ ] Weekly review process established
- [ ] Zero missed days in past month

---

## 🛠️ Troubleshooting Production Issues

### Issue: Render cron job fails

**Check:**
1. Render logs for error messages
2. Environment variables set correctly
3. TOKEN_JSON valid and not expired
4. Salesloft API key still active

**Fix:**
```bash
# Re-authenticate locally
rm token.json
npm test
# Copy new token.json to Render env var
```

---

### Issue: Processed_call_ids.json not persisting

**Cause:** Render cron jobs are stateless

**Fix:** Implement Google Drive storage:
```javascript
// Before processing
await downloadProcessedIdsFromDrive();

// After processing
await uploadProcessedIdsToDrive();
```

---

### Issue: Hitting API rate limits

**Cause:** Too many requests

**Fix in config.js:**
```javascript
batch: {
  API_DELAY_MS: 500,  // Slow down to 2 calls/sec
}
```

---

### Issue: Google Drive quota exceeded

**Cause:** Too many files

**Solutions:**
1. Archive old transcripts to separate folder
2. Compress transcripts before upload
3. Use Google Workspace for unlimited storage
4. Delete duplicate/test files

---

## 📁 Recommended Project Structure (Production)

```
gyde-transcripts/
├── lib/
│   ├── storage.js         ← Google Drive storage for tracking file
│   ├── notifications.js   ← Email/Slack alerts
│   └── logger.js          ← Winston logging
│
├── config/
│   ├── development.js     ← Local dev config
│   └── production.js      ← Render production config
│
├── scripts/
│   ├── deploy.sh          ← Deployment helper
│   └── backup.sh          ← Backup processed IDs
│
├── docs/                  ← Documentation (existing)
├── test.js               ← Test mode (existing)
├── batch.js              ← Batch mode (existing)
├── index.js              ← Core logic (existing)
├── render.yaml           ← Render configuration
└── .github/
    └── workflows/
        └── deploy.yml     ← Auto-deploy on push
```

---

## 🎯 Current Priority: Phase 1

**Focus on completing Phase 1 before moving to automation:**

```bash
# Run this daily for 1 week
npm run batch
```

**Track in a spreadsheet:**
| Date | Run Time | New Transcripts | Total Processed | Errors |
|------|----------|-----------------|-----------------|--------|
| 11/12 | 3:47 min | 47 | 2,847 | 0 |
| 11/13 | 2:15 min | 12 | 2,859 | 0 |
| 11/14 | 1:58 min | 8 | 2,867 | 0 |

**After 1 week of successful manual runs → Move to Phase 2**

---

## 📞 Questions Before Proceeding?

Before starting Render deployment, confirm:

- [ ] Have you completed full historical backfill? (Phase 1 complete)
- [ ] Did daily manual runs work for at least 3 days in a row?
- [ ] Do you have a Render account (or want to use different platform)?
- [ ] Do you want notifications (email/Slack)?
- [ ] Any specific monitoring requirements?

---

## 🚦 Go/No-Go Decision

**Ready to proceed to Render deployment when:**

✅ Phase 1 complete (all historical transcripts extracted)
✅ Daily manual runs successful for 1 week
✅ No errors in processing
✅ Google Drive uploads working 100%
✅ Comfortable with manual process

**NOT ready if:**
❌ Still finding new transcripts in backfill
❌ Errors occurring frequently
❌ Google Drive uploads failing
❌ Not confident in manual process

---

**Current Status: Phase 1 - Manual Process Verification**

**Next Action:** Run `npm run batch` daily for 1 week to verify stability before automating.
