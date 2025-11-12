# Next Steps & Known Issues

## 🚀 START HERE - When You Resume Work

**Last Session:** 2025-11-12
**Status:** Successfully downloaded 34 phone call transcripts, duplicate prevention verified working

**Your Next Task:**
1. Read the "TODO: Add Video Meeting Support" section below
2. Test the API to confirm video meetings have transcriptions
3. Modify the script to fetch from `/conversations.json` instead of `/call_data_records.json`
4. Run `npm test` to verify, then `npm run batch` to download all video transcripts

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

### Required Changes

1. **Fetch from Conversations Endpoint Directly**
   - Current: Uses `call_data_records.json` as primary source
   - Needed: Fetch from `conversations.json` with all media types

2. **Filter by Media Type**
   ```javascript
   // Check media_type field in conversations
   // Values likely include: "audio", "video", etc.
   ```

3. **Update Logic**
   - Remove dependency on `call_data_records` as primary source
   - Iterate through all conversations with transcriptions
   - Check `media_type` to categorize (phone vs video)

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
