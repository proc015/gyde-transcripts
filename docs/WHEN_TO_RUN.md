# When to Run: Simple Decision Guide

## 🤔 Which Command Should I Run?

```
┌─────────────────────────────────────────┐
│  What do you want to do?               │
└─────────────────────────────────────────┘
            │
            ├─── Just testing / checking setup?
            │    → Run: npm test
            │
            ├─── Get ALL my call transcripts?
            │    → Run: npm run batch (multiple times)
            │
            └─── Keep getting new transcripts daily?
                 → Run: npm run batch (once per day)
```

---

## 🧪 npm test - When to Use

### Run `npm test` when:

✅ **First time setup** - Making sure everything works
✅ **Quick check** - "Are there any new transcripts today?"
✅ **Testing changes** - After modifying config.js
✅ **Spot checking** - Verify transcript quality
✅ **Troubleshooting** - Diagnose issues without processing everything

### What it does:
- Scans **100** call records
- Stops after finding **15** AI transcripts
- Takes **1-2 minutes**
- Auto-skips duplicates
- Safe to run anytime

### Example Output:
```
🎯 MODE: Limited - Target 15 new AI transcripts
✅ Found this run: 15 AI transcripts
📋 Total processed (all time): 268 calls
```

---

## 📦 npm run batch - When to Use

### Run `npm run batch` when:

✅ **First-time data extraction** - Get all your historical transcripts
✅ **Backfill missing data** - Catch up on transcripts you don't have
✅ **Daily/Weekly sync** - Keep transcripts up-to-date
✅ **Processing large volumes** - Need more than 15 transcripts
✅ **Production runs** - Serious data extraction

### What it does:
- Scans **500** call records per run
- **No limit** on transcripts found
- Takes **3-10 minutes** per run
- Auto-skips duplicates
- Saves progress every 10 calls

### Example Output:
```
🎯 MODE: Unlimited - Process all available calls
✅ Found this run: 47 AI transcripts
📋 Total processed (all time): 1,892 calls

💡 Scanned 500 records. Run again to continue processing more calls.
```

---

## 📅 Common Scenarios

### Scenario 1: Brand New Setup (First Time)

**Goal:** Get all your call transcripts for the first time

**Steps:**
```bash
# Step 1: Test everything works
npm test

# Step 2: Run batch mode repeatedly
npm run batch   # Wait 5 min → Found 47 transcripts
npm run batch   # Wait 5 min → Found 38 transcripts
npm run batch   # Wait 5 min → Found 29 transcripts
npm run batch   # Wait 5 min → Found 12 transcripts
npm run batch   # Wait 5 min → Found 0 transcripts ← DONE!
```

**How many times?** Keep running until you see "Found 0 new transcripts"

**Total time?** Depends on your data:
- 1,000 total calls → ~5-10 runs (~30-50 minutes)
- 5,000 total calls → ~10-20 runs (~2-3 hours)
- 10,000 total calls → ~20-40 runs (~4-6 hours)

💡 **Tip:** You can stop anytime! Progress is saved, just run again to continue.

---

### Scenario 2: Daily Updates

**Goal:** Keep transcripts current with new calls

**Steps:**
```bash
# Once per day (e.g., every morning)
npm run batch
```

**Expected:**
- Takes **1-3 minutes**
- Finds **0-10 new transcripts** (depending on call volume)
- Shows "Skipped XXX already processed calls"

**Schedule it:**
```bash
# macOS/Linux cron - runs daily at 2 AM
0 2 * * * cd /path/to/gyde-transcripts && npm run batch
```

---

### Scenario 3: Weekly Batch Update

**Goal:** Sync transcripts once per week

**Steps:**
```bash
# Every Monday morning
npm run batch
npm run batch  # Run twice to catch everything
```

**Expected:**
- Takes **5-15 minutes**
- Finds **10-50 new transcripts** (depending on weekly call volume)

---

### Scenario 4: Checking for New Transcripts

**Goal:** "Do I have any new transcripts today?"

**Steps:**
```bash
# Quick check
npm test
```

**Expected:**
- Takes **30 seconds**
- Shows if new transcripts exist
- Doesn't process everything

**Read the summary:**
```
✅ Found this run: 8 AI transcripts  ← Yes, new ones available!
✅ Found this run: 0 AI transcripts  ← No new ones today
```

---

### Scenario 5: After Being Away

**Goal:** You haven't run the script in 2 weeks, now you're back

**Steps:**
```bash
# Run batch mode until caught up
npm run batch   # Finds 89 new transcripts
npm run batch   # Finds 52 new transcripts
npm run batch   # Finds 0 new transcripts ← Caught up!
```

---

## 🔄 Visual Workflow

### Initial Full Extraction
```
Day 1:
  npm run batch → 47 transcripts found
  npm run batch → 38 transcripts found
  npm run batch → 29 transcripts found
  npm run batch → 0 transcripts found ✅ DONE!

Total: 114 AI transcripts extracted
```

### Daily Sync
```
Monday:    npm run batch → 8 new transcripts
Tuesday:   npm run batch → 3 new transcripts
Wednesday: npm run batch → 5 new transcripts
Thursday:  npm run batch → 0 new transcripts (slow day)
Friday:    npm run batch → 12 new transcripts
```

---

## 📊 How Do I Know When I'm Done?

### You're done when:

```
=== SUMMARY ===
✅ Found this run: 0 AI transcripts        ← Zero new transcripts!
📋 Total processed (all time): 2,847 calls

⏭️  Skipped 500 already processed calls   ← Everything is already processed
```

### You're NOT done when:

```
=== SUMMARY ===
✅ Found this run: 23 AI transcripts       ← Still finding new ones!
📋 Total processed (all time): 1,405 calls

💡 Scanned 500 records. Run again to continue processing more calls.
                        ↑↑↑
                This message means "run again"
```

---

## ⏰ Recommended Schedule

### Initial Setup Phase (Week 1)
```
Run: npm run batch
Frequency: Every few hours (or all at once)
Goal: Get all historical data
Stop when: Found 0 new transcripts
```

### Ongoing Maintenance (After initial setup)
```
Run: npm run batch
Frequency: Daily or weekly
Goal: Keep data current
Expected: 0-20 new transcripts per run
```

---

## 🚨 Common Mistakes

### ❌ WRONG: Running test mode for production
```bash
npm test  # Only gets 15 transcripts, then stops!
```
**Use batch mode instead** for full extraction.

---

### ❌ WRONG: Running batch once and expecting everything
```bash
npm run batch  # Only processes 500 records
# "Why didn't I get everything?"
```
**Run multiple times** until you see 0 new transcripts.

---

### ❌ WRONG: Deleting processed_call_ids.json
```bash
rm processed_call_ids.json  # Now it will reprocess everything!
```
**Don't delete this file** unless you want to start over.

---

### ✅ RIGHT: Run batch multiple times
```bash
npm run batch  # Run 1
npm run batch  # Run 2
npm run batch  # Run 3... until done
```

---

## 💡 Pro Tips

### Tip 1: Check progress without running
```bash
cat processed_call_ids.json | grep "processedIds" -A 5
```
Shows how many calls you've processed total.

---

### Tip 2: Run batch during low-usage hours
```bash
# Schedule for 2 AM when Salesloft API is less busy
0 2 * * * cd /path/to/gyde-transcripts && npm run batch
```

---

### Tip 3: Test before batch
```bash
npm test          # Make sure setup works
npm run batch     # Then run production
```

---

### Tip 4: Monitor Google Drive uploads
After running, check your Google Drive folder to verify files are uploading correctly.

---

## 🎯 Decision Tree

```
START
  │
  ├─ Is this your first time running?
  │   YES → npm test (verify setup)
  │         └─ Works? → npm run batch (get all data)
  │   NO  → Continue below
  │
  ├─ Do you want ALL transcripts?
  │   YES → npm run batch (multiple times)
  │   NO  → Continue below
  │
  ├─ Do you want to check for new ones?
  │   YES → npm test (quick check)
  │   NO  → Continue below
  │
  └─ Daily/weekly maintenance?
      YES → npm run batch (once per day/week)
```

---

## 📞 Quick Reference

| What You Want | Command | Expected Time | Run How Often |
|---------------|---------|---------------|---------------|
| Test setup | `npm test` | 1-2 min | Once |
| Get everything (first time) | `npm run batch` | 30 min - 3 hours | Multiple times |
| Daily updates | `npm run batch` | 1-3 min | Daily |
| Weekly updates | `npm run batch` | 5-15 min | Weekly |
| Quick check | `npm test` | 30 sec | Anytime |

---

## ❓ FAQ

**Q: Can I run both commands on the same day?**
A: Yes! They share the same processed_call_ids.json, so they won't duplicate.

**Q: Will running batch mode twice process the same calls?**
A: No! It auto-skips duplicates. Safe to run as many times as you want.

**Q: How do I know if I need to run batch again?**
A: If the summary says "Run again to continue" or you found >0 transcripts, run again.

**Q: Can I stop batch mode mid-run?**
A: Yes! Progress saves every 10 calls. Just run again to resume.

**Q: What if I accidentally run test mode instead of batch?**
A: No problem! It only processes 15, then you can run batch to get the rest.

---

**Still confused?** Just remember:

- 🧪 **`npm test`** = Quick check (15 max)
- 📦 **`npm run batch`** = Get everything (unlimited)

When in doubt, run **`npm run batch`** multiple times until it finds 0 new transcripts!
