# GitHub Actions Setup Guide

Complete guide to set up automated weekly transcript syncing using GitHub Actions.

---

## Overview

**What this does:**
- Runs automatically every Monday at 9 AM (or your chosen schedule)
- Fetches new transcripts from SalesLoft
- Uploads to Google Drive
- Creates updated Salesforce import CSV
- Commits the updated CSV to your repo

**Cost:** $0 (within free tier)
**Setup time:** 30-40 minutes

---

## Part 1: Create Google Cloud Service Account

**Why:** Service accounts don't require manual OAuth - they authenticate automatically.

### Step 1.1: Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. Sign in with your Google account (same one that has the Drive folder)

### Step 1.2: Create or Select a Project

**If you already have a project:**
- Select it from the dropdown at the top

**If you need to create a new project:**
1. Click the project dropdown (top left, next to "Google Cloud")
2. Click **"NEW PROJECT"**
3. Project name: `gyde-transcripts`
4. Click **"CREATE"**
5. Wait ~30 seconds for it to be created
6. Select the new project from the dropdown

### Step 1.3: Enable Google Drive API

1. In the search bar at top, type: `Google Drive API`
2. Click **"Google Drive API"**
3. Click **"ENABLE"** button
4. Wait for it to enable (~10 seconds)

### Step 1.4: Create Service Account

1. In the left sidebar, click **"Credentials"** (or search for it)
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"Service account"**

**Fill in the form:**
- **Service account name:** `github-actions-bot`
- **Service account ID:** (auto-fills) `github-actions-bot`
- **Description:** `Automated transcript sync for GitHub Actions`
- Click **"CREATE AND CONTINUE"**

**Grant access (Step 2):**
- **Role:** Select `Basic` → `Editor` (or skip this, not critical)
- Click **"CONTINUE"**

**Grant users access (Step 3):**
- Leave blank
- Click **"DONE"**

### Step 1.5: Create Service Account Key (JSON)

1. You should now see the service account in the list
2. Click on the service account email (e.g., `github-actions-bot@...iam.gserviceaccount.com`)
3. Click the **"KEYS"** tab
4. Click **"ADD KEY"** → **"Create new key"**
5. Select **"JSON"**
6. Click **"CREATE"**

**A JSON file will download** - this is your service account key.
**IMPORTANT:** Keep this file safe! It's like a password.

**Example filename:** `gyde-transcripts-1234567890ab.json`

### Step 1.6: Share Google Drive Folder with Service Account

1. Open the JSON file you just downloaded
2. Find the `client_email` field - copy that email
   - It looks like: `github-actions-bot@gyde-transcripts.iam.gserviceaccount.com`

3. Go to your Google Drive folder (the one with transcripts)
4. Right-click the folder → **Share**
5. Paste the service account email
6. Set permission to **"Editor"**
7. **UNCHECK** "Notify people" (it's a bot, not a person)
8. Click **"Share"**

✅ **Done!** The service account can now access your Drive folder.

---

## Part 2: Update Code to Use Service Account

### Step 2.1: Add Service Account Support

I'll update the code to support both OAuth (for local development) and service accounts (for GitHub Actions).

**File to update:** `src/services/google-drive-service.js`

The code will automatically detect:
- If `GOOGLE_SERVICE_ACCOUNT_KEY` env var exists → Use service account
- Otherwise → Use OAuth (current method)

### Step 2.2: Add Service Account Key to .gitignore

**IMPORTANT:** Never commit the service account JSON to git!

The `.gitignore` already covers this, but verify:
- `service-account.json` should NOT be committed
- We'll add it as a GitHub secret instead

---

## Part 3: Set Up GitHub Secrets

### Step 3.1: Prepare Secret Values

You need to add these as GitHub secrets:

**1. SALESLOFT_API_KEY**
- Your SalesLoft API key
- Find it in your `.env` file: `SALESLOFT_API_KEY=...`

**2. GOOGLE_DRIVE_FOLDER_ID**
- Your Google Drive folder ID
- Find it in your `.env` file: `GOOGLE_DRIVE_FOLDER_ID=...`

**3. GOOGLE_SERVICE_ACCOUNT_KEY**
- The entire contents of the service account JSON file
- Open the downloaded JSON file in a text editor
- Copy the ENTIRE contents (including `{` and `}`)

**4. SALESFORCE_CSV_PATH**
- Path to your Salesforce export CSV
- Value: `data/salesforce/Report-2025-11-15-06-23-44.csv`

### Step 3.2: Add Secrets to GitHub

1. Go to your GitHub repo
2. Click **"Settings"** tab
3. In left sidebar: **"Secrets and variables"** → **"Actions"**
4. Click **"New repository secret"**

**Add each secret:**

| Name | Value (from above) |
|------|-------------------|
| `SALESLOFT_API_KEY` | Your SalesLoft API key |
| `GOOGLE_DRIVE_FOLDER_ID` | Your Drive folder ID |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Full JSON file contents |
| `SALESFORCE_CSV_PATH` | `data/salesforce/Report-2025-11-15-06-23-44.csv` |

For each one:
1. Click **"New repository secret"**
2. Enter the **Name**
3. Paste the **Value**
4. Click **"Add secret"**

---

## Part 4: Create GitHub Actions Workflow

### Step 4.1: Create Workflow File

Create: `.github/workflows/weekly-transcript-sync.yml`

This file tells GitHub Actions what to do and when.

**The workflow will:**
1. Run every Monday at 9 AM UTC
2. Install dependencies
3. Run the weekly automation script
4. Commit and push the updated CSV

### Step 4.2: Configure Schedule

The default schedule is Monday at 9 AM UTC.

**Want a different time?**

Edit the cron expression in the workflow file:

```yaml
schedule:
  - cron: '0 9 * * 1'  # Monday 9 AM UTC
```

**Examples:**

| Schedule | Cron Expression |
|----------|----------------|
| Monday 9 AM UTC | `0 9 * * 1` |
| Friday 5 PM UTC | `0 17 * * 5` |
| Every day 8 AM UTC | `0 8 * * *` |
| Monday & Friday 10 AM UTC | `0 10 * * 1,5` |

**Note:** GitHub Actions uses UTC time. Convert to your local timezone:
- PST/PDT: UTC - 8 hours
- EST/EDT: UTC - 5 hours
- CST/CDT: UTC - 6 hours

---

## Part 5: Test the Workflow

### Step 5.1: Manual Test Run

1. Go to your GitHub repo
2. Click **"Actions"** tab
3. In the left sidebar, click **"Weekly Transcript Sync"**
4. Click **"Run workflow"** dropdown (top right)
5. Select branch: `main`
6. Click **"Run workflow"** button

### Step 5.2: Monitor the Run

1. You'll see a new workflow run appear
2. Click on it to see details
3. Watch the logs in real-time
4. It should take 2-5 minutes to complete

**Check for:**
- ✅ "Fetch and process new transcripts" step succeeds
- ✅ "Create Salesforce import CSV" step succeeds
- ✅ "Commit updated CSV" step succeeds
- ✅ Green checkmark on the run

### Step 5.3: Verify the Results

1. Go to your repo's main page
2. Navigate to `data/salesforce_import_ready.csv`
3. You should see:
   - Updated file
   - Commit message: `chore: update Salesforce import CSV [automated]`
   - Committed by: `github-actions[bot]`

✅ **If all green, you're done!** It will now run automatically every Monday.

---

## Part 6: Ongoing Maintenance

### View Workflow Runs

**Check what happened:**
1. Go to **Actions** tab
2. See all historical runs
3. Click any run to see logs

### Pause Automation

**Temporarily stop the weekly runs:**
1. Go to **Actions** tab
2. Click **"Weekly Transcript Sync"**
3. Click **"..."** (top right)
4. Click **"Disable workflow"**

**Re-enable later:**
1. Same steps
2. Click **"Enable workflow"**

### Update Schedule

**Change the day/time:**
1. Edit `.github/workflows/weekly-transcript-sync.yml`
2. Update the `cron:` line
3. Commit and push

---

## Troubleshooting

### Authentication Error: Google Drive

**Error:** "Service account authentication failed"

**Fix:**
1. Verify the Google Drive folder is shared with the service account email
2. Check that `GOOGLE_SERVICE_ACCOUNT_KEY` secret contains the full JSON (including `{` and `}`)
3. Verify the service account has "Editor" permissions on the folder

### Authentication Error: SalesLoft

**Error:** "SalesLoft API authentication failed"

**Fix:**
1. Check that `SALESLOFT_API_KEY` secret is correct
2. Verify the API key hasn't expired
3. Check SalesLoft API rate limits

### No New Transcripts Found

**This is normal if:**
- No new calls were made since last run
- All calls were already processed

**Check:**
- Look at the workflow logs
- See "New transcripts processed: 0" (expected if no new calls)

### Workflow Doesn't Run on Schedule

**Possible causes:**
1. Workflow is disabled - Re-enable it
2. Repository is private and free minutes exhausted - Check billing
3. No commits in 60 days - GitHub pauses workflows (make a commit to reactivate)

### Service Account Key Expired

**Service account keys don't expire automatically**, but if deleted:

1. Go to Google Cloud Console
2. Navigate to Service Accounts
3. Create a new key for the same service account
4. Update the `GOOGLE_SERVICE_ACCOUNT_KEY` secret in GitHub

---

## Security Best Practices

### ✅ DO:
- Keep service account JSON file secure (never commit to git)
- Use GitHub secrets for sensitive data
- Limit service account permissions to only what's needed
- Review workflow runs regularly

### ❌ DON'T:
- Commit `.env` files or service account keys
- Share service account JSON publicly
- Give service account more permissions than needed
- Ignore failed workflow runs

---

## Summary

**What you set up:**
1. ✅ Google Cloud service account (automated auth)
2. ✅ GitHub secrets (secure credentials)
3. ✅ GitHub Actions workflow (scheduled automation)
4. ✅ Automatic CSV updates (every Monday)

**What happens now:**
- Every Monday at 9 AM UTC
- GitHub Actions automatically:
  1. Fetches new transcripts from SalesLoft
  2. Uploads to Google Drive
  3. Creates updated Salesforce import CSV
  4. Commits CSV to your repo

**You just need to:**
- Import the CSV to Salesforce weekly (or automate that too!)

**Total cost:** $0
**Total maintenance:** 0 minutes/month

🎉 **Congratulations! Your transcript pipeline is now fully automated.**
