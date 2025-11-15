# GitHub Secrets - Quick Reference

Add these 3 secrets to your GitHub repository for the automation to work.

---

## How to Add Secrets

1. Go to your GitHub repo
2. Click **Settings** tab
3. Left sidebar: **Secrets and variables** → **Actions**
4. Click **New repository secret** for each one below

---

## Required Secrets

### 1. SALESLOFT_API_KEY

**Name:** `SALESLOFT_API_KEY`

**Value:** Your SalesLoft API key

**Where to find it:**
- Open your `.env` file locally
- Copy the value after `SALESLOFT_API_KEY=`
- Example: `v2_abcd1234efgh5678...`

---

### 2. GOOGLE_DRIVE_FOLDER_ID

**Name:** `GOOGLE_DRIVE_FOLDER_ID`

**Value:** Your Google Drive folder ID

**Where to find it:**
- Open your `.env` file locally
- Copy the value after `GOOGLE_DRIVE_FOLDER_ID=`
- Example: `1AbCdEfGhIjKlMnOpQrStUvWxYz`

Or get it from the folder URL:
- https://drive.google.com/drive/folders/**1AbCdEfGhIjKlMnOpQrStUvWxYz**

---

### 3. GOOGLE_SERVICE_ACCOUNT_KEY

**Name:** `GOOGLE_SERVICE_ACCOUNT_KEY`

**Value:** The ENTIRE contents of your service account JSON file

**Where to get it:**
1. Download the service account JSON file from Google Cloud Console
   (See: `docs/GITHUB_ACTIONS_SETUP.md` Part 1, Step 1.5)
2. Open the JSON file in a text editor
3. Copy ALL of it (including the `{` and `}`)

**Example format:**
```json
{
  "type": "service_account",
  "project_id": "gyde-transcripts",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "github-actions-bot@gyde-transcripts.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

**IMPORTANT:**
- Copy the ENTIRE JSON (all the way to the closing `}`)
- Don't modify or format it - paste exactly as is
- Keep this file safe locally (don't commit to git)

---

## Verify Secrets Are Added

After adding all 3 secrets:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. You should see:
   - `SALESLOFT_API_KEY`
   - `GOOGLE_DRIVE_FOLDER_ID`
   - `GOOGLE_SERVICE_ACCOUNT_KEY`

✅ If all 3 are there, you're ready to test!

---

## Test the Workflow

1. Go to **Actions** tab
2. Click **Weekly Transcript Sync** (left sidebar)
3. Click **Run workflow** dropdown (top right)
4. Select branch: `main`
5. Click **Run workflow** button
6. Watch it run (takes 2-5 mins)

If all green ✅, you're done!

---

## Troubleshooting

**Error: "SALESLOFT_API_KEY is not set"**
- Make sure secret name is exactly `SALESLOFT_API_KEY` (case-sensitive)
- Verify the value doesn't have extra spaces

**Error: "GOOGLE_SERVICE_ACCOUNT_KEY is invalid"**
- Make sure you copied the ENTIRE JSON file contents
- Check that it starts with `{` and ends with `}`
- Verify no characters were cut off

**Error: "Service account authentication failed"**
- Verify you shared the Google Drive folder with the service account email
- Check the service account has "Editor" permissions
- Make sure the Drive folder ID is correct

---

## Security Notes

- ✅ Secrets are encrypted by GitHub
- ✅ Secrets are never shown in logs
- ✅ Only workflows in this repo can access them
- ✅ Delete old service account keys if you create new ones

---

**Need more help?** See the full guide: `docs/GITHUB_ACTIONS_SETUP.md`
