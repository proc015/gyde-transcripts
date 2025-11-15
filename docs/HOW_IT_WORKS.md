# How It Works - Simple Explanation

## The Tracking System

Every time the script downloads transcripts, it remembers TWO things in a file called `processed_call_ids.json`:

1. **Which calls were downloaded** (the call IDs)
2. **Where to continue** (the next page number)

**Think of it like a bookmark in a book:**
- ✅ Calls 1-500: Already downloaded (Page 5 complete)
- 📄 Bookmark: Start at page 6 next time
- ❌ Calls 501+: Not downloaded yet

When you run the script again, it:
1. Checks the list and **skips** any already-downloaded calls
2. **Continues from the bookmarked page** to get the next batch

## The Three Commands

### `npm test` - Testing & Quick Checks
**When to use:**
- First time setting up the script
- You want to see if it's working correctly
- You want a small sample of transcripts (15 max)
- You're debugging or testing changes

**What it does:**
- Scans 100 call records
- Stops after finding 15 AI transcripts
- Skips anything already in `processed_call_ids.json`

**Example:**
```bash
npm test  # Downloads 15 transcripts, saves them to processed_call_ids.json
npm test  # Runs again, skips those 15, finds 15 NEW ones
```

---

### `npm run batch` - Get Everything
**When to use:**
- You want ALL your call transcripts
- Running for the first time in production
- Running regularly to catch new calls

**What it does:**
- Scans 500 call records per run
- Downloads ALL AI transcripts it finds (no limit)
- Skips anything already in `processed_call_ids.json`
- Keeps going until it processes all 500 records

**Example workflow:**
```bash
npm run batch  # Pages 1-5: Scans 500 records, downloads 42 new transcripts
npm run batch  # Pages 6-10: Scans next 500 records, downloads 38 new transcripts
npm run batch  # Pages 11-15: Scans next 500 records, downloads 25 new transcripts
npm run batch  # Pages 16-20: Scans next 500 records, downloads 0 (all done!)
```

**How it progresses through your data:**
The script automatically picks up where it left off. If you have 2,000 calls:
- Run 1: Fetches pages 1-5 (calls 1-500), processes them
- Run 2: Fetches pages 6-10 (calls 501-1000), processes them
- Run 3: Fetches pages 11-15 (calls 1001-1500), processes them
- Run 4: Fetches pages 16-20 (calls 1501-2000), processes them

Each run automatically continues from where the last one stopped!

---

### `npm run clean` - Start Over
**When to use:**
- After fixing a bug (like the duplicate transcript bug)
- You want to re-download everything from scratch
- Something went wrong and you want a fresh start

**What it does:**
- Backs up `processed_call_ids.json` to `./backups/` folder
- Deletes `processed_call_ids.json`
- Now the script thinks nothing has been downloaded yet

**Example workflow:**
```bash
npm run clean   # Clears the tracker (backs up first)
npm run batch   # Re-downloads EVERYTHING (because tracker is empty)
```

---

## How Duplicate Prevention Works

### Scenario 1: Normal Usage (No Duplicates)
```bash
npm run batch  # Downloads 50 transcripts, saves IDs to tracker
npm run batch  # Checks tracker, skips those 50, downloads 40 NEW ones
```
✅ No duplicates because the tracker remembers what's been downloaded

### Scenario 2: After Bug Fix (Your Situation)
```bash
# Old buggy version downloaded 20 transcripts (all identical due to bug)
# Tracker has 20 call IDs marked as "processed"

npm run clean  # Clears the tracker
npm run batch  # Re-downloads all 20 calls (with the fix, so now they're unique!)
```
✅ No duplicates because clean reset the tracker

### Scenario 3: Running on a Schedule
```bash
# Monday
npm run batch  # Downloads 100 transcripts from last week

# Tuesday (new calls came in)
npm run batch  # Skips Monday's 100, downloads 15 NEW calls from today

# Wednesday
npm run batch  # Skips all 115 previous calls, downloads 8 NEW calls
```
✅ No duplicates because tracker keeps growing with each run

---

## The Tracker File

**Location:** `./processed_call_ids.json`

**What it looks like:**
```json
{
  "lastUpdated": "2025-11-12T10:30:00.000Z",
  "nextPage": 6,
  "processedIds": [
    "12345",
    "12346",
    "12347"
  ]
}
```

**Key points:**
- Automatically created on first run
- Tracks both processed call IDs AND pagination position
- `nextPage`: The page number to start from on the next run
- Automatically updated after every 10 calls (to save progress)
- Grows over time as you download more transcripts
- Deleted by `npm run clean` (with backup)
- Backed up before deletion

---

## Your Current Situation - Step by Step

**Problem:** You downloaded transcripts, but they all have the same content

**Solution:**

1. **Delete the duplicate files from Google Drive** (you already did this ✅)

2. **Run the clean command:**
   ```bash
   npm run clean
   ```
   This backs up your current tracker and clears it

3. **Run batch to re-download:**
   ```bash
   npm run batch
   ```
   Now it downloads everything fresh with the bug fix

4. **Verify the fix worked:**
   - Open a few transcript files
   - Check that they have different content
   - Look at the console logs - you'll see different transcription IDs

5. **Continue if needed:**
   ```bash
   npm run batch  # If you have more than 500 calls
   npm run batch  # Keep running until it says "Found 0 new transcripts"
   ```

---

## Quick Decision Guide

**"I just want to test if the script works"**
→ `npm test`

**"I want all my transcripts"**
→ `npm run batch` (run multiple times until complete)

**"Something went wrong, I need to start over"**
→ `npm run clean` then `npm run batch`

**"I run this weekly to get new calls"**
→ Just `npm run batch` (it auto-skips old ones)

**"I fixed a bug and need to re-download"**
→ `npm run clean` then `npm run batch`

---

## Summary

- **Tracker file** = Remembers what's been downloaded + where to continue
- **Pagination** = Each run continues from where the last one stopped
- **test** = Small sample (15 transcripts, pages 1-5)
- **batch** = Everything (500 records per run, automatically continues to next pages)
- **clean** = Reset tracker and pagination (use before re-downloading from page 1)

All commands automatically:
1. **Prevent duplicates** by checking processed call IDs
2. **Continue from where you left off** using the nextPage bookmark
3. **Progress through your entire dataset** incrementally
