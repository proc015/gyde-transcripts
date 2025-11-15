# Service Account Setup - Step-by-Step Checklist

Follow this checklist to set up your GitHub Actions automation.

**Estimated time:** 30-40 minutes

---

## ☐ PART 1: Create Google Cloud Service Account (20 mins)

### ☐ Step 1: Go to Google Cloud Console

1. Open: https://console.cloud.google.com/
2. Sign in with your Google account (same one that owns the Drive folder)

---

### ☐ Step 2: Create or Select Project

**If you already have a project for this:**
- Select it from the dropdown at the top

**If you need a new project:**
1. Click the project dropdown (top left, says "Select a project")
2. Click **"NEW PROJECT"**
3. Project name: `gyde-transcripts`
4. Click **"CREATE"**
5. Wait ~30 seconds
6. Select the new project

✅ **Checkpoint:** You should see your project name at the top of the page

---

### ☐ Step 3: Enable Google Drive API

1. In the search bar at top, type: `Google Drive API`
2. Click **"Google Drive API"** in results
3. Click the blue **"ENABLE"** button
4. Wait ~10 seconds for it to enable

✅ **Checkpoint:** You should see "API enabled" and a dashboard

---

### ☐ Step 4: Create Service Account

1. Click the **"Credentials"** link in the left sidebar (or search for it)
2. Click **"+ CREATE CREDENTIALS"** button at the top
3. Select **"Service account"**

**Fill in the form:**

**Page 1 - Service account details:**
- Service account name: `github-actions-bot`
- Service account ID: (auto-fills) `github-actions-bot`
- Description: `Automated transcript sync for GitHub Actions`
- Click **"CREATE AND CONTINUE"**

**Page 2 - Grant access:**
- **Skip this** - Click **"CONTINUE"** (no role needed)

**Page 3 - Grant users access:**
- **Skip this** - Click **"DONE"**

✅ **Checkpoint:** You should see the service account listed with an email like:
`github-actions-bot@gyde-transcripts.iam.gserviceaccount.com`

---

### ☐ Step 5: Download Service Account Key (JSON)

1. Click on the service account email you just created
2. Click the **"KEYS"** tab at the top
3. Click **"ADD KEY"** → **"Create new key"**
4. Select format: **"JSON"**
5. Click **"CREATE"**

**A JSON file will download automatically.**

**Example filename:** `gyde-transcripts-abc123xyz.json`

✅ **Checkpoint:** You have a JSON file downloaded. **KEEP THIS SAFE!**

⚠️ **IMPORTANT:**
- Do NOT commit this file to git
- Do NOT share it publicly
- Keep it safe like a password

---

### ☐ Step 6: Copy Service Account Email

1. Open the downloaded JSON file in a text editor
2. Find the line: `"client_email": "..."`
3. Copy the email address (looks like `github-actions-bot@...iam.gserviceaccount.com`)

**Keep this email handy** - you'll need it in the next step.

---

### ☐ Step 7: Share Google Drive Folder with Service Account

1. Go to Google Drive: https://drive.google.com/
2. Find your transcript folder (the one with all the .txt files)
3. **Right-click** the folder → **"Share"**
4. **Paste** the service account email (from Step 6)
5. Set permission to: **"Editor"**
6. **UNCHECK** the box "Notify people" (it's a bot, not a person)
7. Click **"Share"** or **"Send"**

✅ **Checkpoint:** The folder should now show the service account email in the sharing list

---

## ☐ PART 2: Add GitHub Secrets (5 mins)

### ☐ Step 1: Go to GitHub Repository Settings

1. Open your GitHub repo: https://github.com/YOUR-USERNAME/gyde-transcripts
2. Click the **"Settings"** tab
3. In left sidebar: **"Secrets and variables"** → **"Actions"**

---

### ☐ Step 2: Add SALESLOFT_API_KEY Secret

1. Click **"New repository secret"** (green button)
2. Name: `SALESLOFT_API_KEY`
3. Value: Open your local `.env` file, copy the value after `SALESLOFT_API_KEY=`
4. Click **"Add secret"**

✅ **Checkpoint:** You should see `SALESLOFT_API_KEY` in the secrets list

---

### ☐ Step 3: Add GOOGLE_DRIVE_FOLDER_ID Secret

1. Click **"New repository secret"**
2. Name: `GOOGLE_DRIVE_FOLDER_ID`
3. Value: Open your local `.env` file, copy the value after `GOOGLE_DRIVE_FOLDER_ID=`
4. Click **"Add secret"**

✅ **Checkpoint:** You should see both secrets now

---

### ☐ Step 4: Add GOOGLE_SERVICE_ACCOUNT_KEY Secret

1. Click **"New repository secret"**
2. Name: `GOOGLE_SERVICE_ACCOUNT_KEY`
3. Value:
   - Open the JSON file you downloaded in Step 5 (Part 1)
   - **Select ALL** the contents (including `{` and `}`)
   - Copy and paste into the Value field

**IMPORTANT:**
- Copy the ENTIRE JSON file
- From the opening `{` to the closing `}`
- Don't modify or format it

4. Click **"Add secret"**

✅ **Checkpoint:** You should see all 3 secrets:
- `SALESLOFT_API_KEY`
- `GOOGLE_DRIVE_FOLDER_ID`
- `GOOGLE_SERVICE_ACCOUNT_KEY`

---

## ☐ PART 3: Push Code to GitHub (2 mins)

### ☐ Step 1: Commit and Push

Open your terminal and run:

```bash
cd /Users/proc/Documents/Repos/gyde-transcripts

git add .github/workflows/
git add src/services/google-drive-service.js
git add scripts/create-salesforce-import-csv.js
git add docs/
git add GITHUB_ACTIONS_README.md
git add SERVICE_ACCOUNT_SETUP_CHECKLIST.md

git commit -m "feat: add GitHub Actions automation with service account support"

git push
```

✅ **Checkpoint:** Code is pushed to GitHub

---

## ☐ PART 4: Test the Automation! (5 mins)

### ☐ Step 1: Trigger Manual Test Run

1. Go to your GitHub repo
2. Click **"Actions"** tab at the top
3. In left sidebar, click **"Weekly Transcript Sync"**
4. Click **"Run workflow"** dropdown (top right, gray button)
5. Make sure branch is set to: `main`
6. Click the green **"Run workflow"** button

✅ **Checkpoint:** You should see a new workflow run appear

---

### ☐ Step 2: Monitor the Run

1. Click on the workflow run (it shows as yellow/orange while running)
2. Click **"sync-transcripts"** to see detailed logs
3. Watch each step complete:
   - ✅ Checkout code
   - ✅ Setup Node.js
   - ✅ Install dependencies
   - ✅ Run weekly automation
   - ✅ Commit updated CSV
   - ✅ Push changes

**Expected time:** 2-5 minutes

✅ **Checkpoint:** All steps show green checkmarks

---

### ☐ Step 3: Verify the Results

1. Go back to your repo's main page
2. You should see a new commit: `chore: update Salesforce import CSV [automated]`
3. Click on `data/salesforce_import_ready.csv`
4. Check the file was updated

✅ **Checkpoint:** CSV file is updated with latest data

---

## 🎉 YOU'RE DONE!

### What Happens Now:

**Every Monday at 9 AM UTC**, GitHub Actions will automatically:
1. Fetch new transcripts from SalesLoft
2. Upload them to Google Drive
3. Create updated Salesforce import CSV
4. Commit the CSV to your repo

**You just need to:**
- Check your repo weekly for the updated CSV
- Import it to Salesforce

---

## 📊 Summary

✅ Service account created
✅ Drive folder shared with service account
✅ GitHub secrets configured
✅ Code pushed to GitHub
✅ Test run successful
✅ Automation active

**Cost:** $0/month
**Maintenance:** 0 minutes/month
**Next run:** Monday at 9 AM UTC

---

## 🔧 Useful Commands

**View generation history:**
```bash
npm run import-history
```

**Run manually (locally):**
```bash
npm run weekly-update
```

**Verify data quality:**
```bash
npm run verify-import
```

---

## ❓ Troubleshooting

**If the test run fails:**

1. Check the workflow logs (click on the failed step)
2. Common issues:
   - ❌ Service account not shared with Drive folder → Go back to Part 1, Step 7
   - ❌ Service account JSON not copied fully → Check the secret includes `{` and `}`
   - ❌ Wrong secret names → Must be exact: `SALESLOFT_API_KEY`, `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_KEY`

**Need help?** Check the logs in the Actions tab for error messages.

---

**Good luck! Let me know when you complete each part and I can help if you get stuck.**
