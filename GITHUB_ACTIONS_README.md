# GitHub Actions Automation - Setup Complete! 🎉

Your automated weekly transcript sync is ready to deploy!

---

## ✅ What's Been Set Up For You

### 1. **Code Updated**
- ✅ `src/services/google-drive-service.js` - Now supports service accounts
- ✅ `scripts/create-salesforce-import-csv.js` - Now supports service accounts
- ✅ Both scripts auto-detect: Service Account (GitHub Actions) or OAuth (local)

### 2. **GitHub Actions Workflow Created**
- ✅ `.github/workflows/weekly-transcript-sync.yml`
- Runs every Monday at 9 AM UTC
- Can also be triggered manually

### 3. **Documentation Created**
- ✅ `docs/GITHUB_ACTIONS_SETUP.md` - Complete step-by-step guide (30-40 mins)
- ✅ `docs/GITHUB_SECRETS_QUICK_REFERENCE.md` - Quick secrets setup (5 mins)

---

## 🚀 Next Steps (You Need To Do)

### Step 1: Create Google Cloud Service Account (~20 mins)

**Follow:** `docs/GITHUB_ACTIONS_SETUP.md` - Part 1

**Summary:**
1. Go to https://console.cloud.google.com/
2. Create a service account named `github-actions-bot`
3. Download the JSON key file
4. Share your Google Drive folder with the service account email

**Result:** You'll have a JSON file like `gyde-transcripts-1234567890ab.json`

---

### Step 2: Add GitHub Secrets (~5 mins)

**Follow:** `docs/GITHUB_SECRETS_QUICK_REFERENCE.md`

**Add these 3 secrets to GitHub:**

| Secret Name | Value |
|-------------|-------|
| `SALESLOFT_API_KEY` | From your `.env` file |
| `GOOGLE_DRIVE_FOLDER_ID` | From your `.env` file |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Full JSON file contents |

**Where to add them:**
- Your repo → Settings → Secrets and variables → Actions → New repository secret

---

### Step 3: Commit & Push (~2 mins)

Push the new workflow file to GitHub:

```bash
git add .github/workflows/weekly-transcript-sync.yml
git add src/services/google-drive-service.js
git add scripts/create-salesforce-import-csv.js
git add docs/
git commit -m "feat: add GitHub Actions automation for weekly transcript sync"
git push
```

---

### Step 4: Test It! (~5 mins)

**Manual test run:**
1. Go to your GitHub repo
2. Click **Actions** tab
3. Click **Weekly Transcript Sync** (left sidebar)
4. Click **Run workflow** → **Run workflow**
5. Watch it run (2-5 minutes)

**Check for:**
- ✅ All steps complete with green checkmarks
- ✅ New commit appears with message: "chore: update Salesforce import CSV [automated]"
- ✅ `data/salesforce_import_ready.csv` is updated

---

## 📅 What Happens Next

**Automated Schedule:**
- Runs every **Monday at 9 AM UTC**
- Fetches new transcripts from SalesLoft
- Uploads to Google Drive
- Creates updated Salesforce import CSV
- Commits the CSV to your repo

**You just:**
- Check your repo weekly for the updated CSV
- Import it to Salesforce when ready

---

## 💰 Cost

**$0 / month**

GitHub Actions free tier:
- Public repos: Unlimited
- Private repos: 2,000 minutes/month free
- Your usage: ~8-20 minutes/month (less than 1%)

---

## ⏱️ Total Setup Time

| Step | Time |
|------|------|
| Create service account | 20 mins |
| Add GitHub secrets | 5 mins |
| Commit & push | 2 mins |
| Test run | 5 mins |
| **Total** | **~30 mins** |

---

## 📚 Documentation Index

1. **Start here:** `docs/GITHUB_ACTIONS_SETUP.md`
   - Complete step-by-step guide
   - Service account setup
   - Troubleshooting

2. **Quick reference:** `docs/GITHUB_SECRETS_QUICK_REFERENCE.md`
   - Just the 3 secrets you need to add
   - Copy-paste ready

3. **Automation details:** `docs/AUTOMATION_GUIDE.md`
   - How the weekly automation works
   - Cron schedules
   - Monitoring

---

## 🔒 Security

- ✅ Service account JSON = Never committed to git
- ✅ GitHub secrets = Encrypted, never shown in logs
- ✅ Service account = Minimal permissions (Drive access only)
- ✅ Workflow = Runs in isolated GitHub environment

---

## ❓ FAQ

**Q: Can I change the schedule?**
A: Yes! Edit `.github/workflows/weekly-transcript-sync.yml` and change the `cron:` line.

Examples:
- Friday 5 PM UTC: `0 17 * * 5`
- Every day 8 AM UTC: `0 8 * * *`

**Q: Can I run it manually?**
A: Yes! Go to Actions tab → Weekly Transcript Sync → Run workflow

**Q: What if it fails?**
A: Check the workflow logs in the Actions tab. Common issues:
- Service account not shared with Drive folder
- Secrets not set correctly
- SalesLoft API rate limit

**Q: Will it work with my local development?**
A: Yes! The code auto-detects:
- GitHub Actions → Uses service account
- Local → Uses OAuth (your current setup)

**Q: Can I pause it?**
A: Yes! Actions tab → Weekly Transcript Sync → ... → Disable workflow

---

## 🎯 Ready to Go!

**Follow the steps above and you'll have:**
- ✅ Fully automated weekly sync
- ✅ Zero maintenance
- ✅ Always up-to-date Salesforce data
- ✅ Complete audit trail (Git commits)

**Questions?** Check the docs or the workflow logs in GitHub Actions.

🚀 **Let's get it automated!**
