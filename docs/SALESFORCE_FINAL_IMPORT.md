# Salesforce Final Import Guide

You now have a complete, ready-to-import CSV file with all 157 transcripts!

**File:** `data/salesforce_import_ready.csv`

---

## What's In The File

Your CSV has everything needed for Salesforce import:

| Column | Description |
|--------|-------------|
| ConversationID | Unique identifier for the call |
| Filename | Transcript filename in Google Drive |
| PersonID | SalesLoft Person ID |
| PersonCrmID | Salesforce Contact ID (for matching) |
| **ContactName** | Contact's full name (for verification) |
| **ContactEmail** | Contact's email (for verification) |
| ContactMatchStatus | ✅ Matched or ❌ Not Found |
| AccountID | SalesLoft Account ID |
| AccountCrmID | Salesforce Account ID (for matching) |
| **AccountName** | Account name (for verification) |
| AccountMatchStatus | ✅ Matched or ❌ Not Found |
| MediaType | audio or video |
| Platform | salesloft or zoom |
| Date | Call date/time |
| Duration | Duration in seconds |
| **GoogleDriveURL** | Direct link to transcript |

**Your Results:**
- ✅ **100% have Google Drive URLs** (157/157)
- ✅ **68% have matching Contacts** (107/157)
- ✅ **71% have matching Accounts** (111/157)

---

## Review Before Importing

**IMPORTANT:** Open the CSV in Excel and review it first!

1. **Open:** `data/salesforce_import_ready.csv` in Excel
2. **Spot check 5-10 rows:**
   - Does ContactName look right?
   - Does AccountName match?
   - Do the MatchStatus flags make sense?
3. **Click a few Google Drive URLs** to verify they work

**Sample rows you can review:**
- Row 3: Linda Morrison - Morrison Insurance Group PC (✅ Full match)
- Row 4: Jake Norton - Stewardship (✅ Full match)
- Row 7: Dawn Levis - Gruene Insurance Group (✅ Full match)

---

## Import Options

You have two options:

### Option 1: Import ALL 157 Records (Recommended)

Import everything at once:
- Records with matches → Will link to Contact/Account
- Records without matches → Will import with blank Contact/Account fields

**Pros:**
- ✅ All transcripts in Salesforce
- ✅ One import process
- ✅ Can update missing lookups later

**Cons:**
- Some records won't have Contact/Account links

---

### Option 2: Import Only Matched Records First

Filter and import just the records that have matches:

1. Open CSV in Excel
2. Filter `ContactMatchStatus` column → Show only "✅ Matched"
3. Save as: `salesforce_import_matched_only.csv`
4. Import this file first (107 records)
5. Later, import the unmatched ones

**Pros:**
- ✅ 100% of first import will have complete data
- ✅ Can test with known-good data

**Cons:**
- Two separate imports
- Missing 50 transcripts initially

---

## How to Import (Step-by-Step)

### Before You Start

**Make sure you've created the Salesforce Custom Object!**

If not, follow **Phase 2** of: `docs/SALESFORCE_TEST_IMPORT_GUIDE.md`

Quick checklist:
- [ ] Created "Call Transcript" custom object
- [ ] Added all 11 custom fields
- [ ] Set Contact.Id and Account.Id as External IDs

---

### Method 1: Salesforce Data Import Wizard (Easier)

1. **Setup → Data → Data Import Wizard**

2. **Launch Wizard → Custom Objects → Call Transcripts**

3. **Add New Records**

4. **Upload CSV:**
   - Choose file: `data/salesforce_import_ready.csv`
   - Character Encoding: UTF-8
   - Click Next

5. **Map Fields:**

   | CSV Column | Salesforce Field |
   |-----------|------------------|
   | ConversationID | Conversation ID |
   | Filename | Transcript Filename |
   | PersonID | SalesLoft Person ID |
   | PersonCrmID | Contact/Lead (use External ID: Contact.Id) |
   | AccountID | SalesLoft Account ID |
   | AccountCrmID | Account (use External ID: Account.Id) |
   | MediaType | Media Type |
   | Platform | Platform |
   | Date | Call Date |
   | Duration | Duration (seconds) |
   | GoogleDriveURL | Google Drive URL |

   **IMPORTANT FOR LOOKUPS:**
   - For `Contact/Lead`: Match by "Contact: Id" (External ID)
   - For `Account`: Match by "Account: Id" (External ID)
   - If no match found: Leave field blank

6. **Review & Start Import**

7. **Check Email** for completion notification

---

### Method 2: Salesforce Data Loader (More Control)

**Better for large imports (100+ records)**

1. **Download Data Loader:**
   - Setup → Data → Data Loader → Download

2. **Launch Data Loader → Insert**

3. **Login** with Salesforce credentials

4. **Select Object:** Call Transcript

5. **Select CSV:** `data/salesforce_import_ready.csv`

6. **Map Fields:**
   - Drag CSV columns to Salesforce fields
   - For Contact/Lead: Map `PersonCrmID` → `Contact_Lead__r.Id`
   - For Account: Map `AccountCrmID` → `Account__r.Id`

7. **Finish → Run Import**

8. **Review Logs:**
   - `success.csv` - Records that imported
   - `error.csv` - Any failures

---

## Verify Import Success

### Step 1: Check Import Status

**Setup → Data → Data Import History**

Verify:
- Status: Completed
- Processed: 157 (or 107 if matched-only)
- Failed: 0

---

### Step 2: View Records

**App Launcher → Call Transcripts**

You should see your records:
- TRANS-0001
- TRANS-0002
- ... (up to 157)

---

### Step 3: Open a Few Records

Click on records that had "✅ Matched" status and verify:

1. **Contact/Lead field** shows a name
2. **Account field** shows a company
3. **Google Drive URL** is clickable
4. Click the URL and verify the transcript opens

**Try these specific records:**
- Search for Contact: "Linda Morrison" → Should find call transcript
- Search for Account: "Stewardship" → Should find call transcript
- Search for Account: "Foundation Insurance Services" → Should find call transcript

---

### Step 4: Run Test Query

**Developer Console → Query Editor:**

```sql
SELECT Id, Name, Conversation_ID__c,
       Contact_Lead__r.Name, Account__r.Name,
       Media_Type__c, Platform__c, Call_Date__c,
       Google_Drive_URL__c
FROM Call_Transcript__c
WHERE Contact_Lead__r.Name != null
ORDER BY Call_Date__c DESC
LIMIT 10
```

This shows your 10 most recent transcripts that have Contact matches.

---

## Common Issues & Solutions

### Issue 1: Lookup Fields Are Blank

**Problem:** Contact/Lead or Account fields are empty

**Causes:**
- ID didn't match any Salesforce record
- That's OK! The CSV showed "❌ Not Found" for these

**Solution:**
- Records still imported successfully
- Just don't have Contact/Account links
- You can update them later if needed

---

### Issue 2: Date Format Errors

**Problem:** Call_Date__c import failed

**Solution:**
- Salesforce may need different date format
- In Excel, format Date column as: `YYYY-MM-DD HH:MM:SS`
- Example: `2025-11-14 21:43:58`
- Re-save CSV and try again

---

### Issue 3: Duplicate Conversation IDs

**Problem:** Some records failed with "duplicate value" error

**Cause:** You might have already imported some of these

**Solution:**
- Check error.csv to see which records failed
- Remove those rows from CSV
- Re-import remaining records
- Or use "Update" instead of "Insert"

---

### Issue 4: Google Drive Links Not Clickable

**Problem:** URLs don't work as links

**Cause:** URL field might need different format

**Solution:**
- Verify field type is "URL" (not Text)
- URLs should start with `https://`
- Test by clicking one in Salesforce

---

## What's Next?

### You Now Have:

✅ 157 call transcripts in Salesforce
✅ Linked to Contacts and Accounts (where matched)
✅ Direct links to Google Drive transcripts
✅ Searchable and reportable in Salesforce

### Next Steps (Optional):

1. **Create Reports:**
   - Transcripts by Account
   - Transcripts by Contact
   - Recent calls this week

2. **Build Dashboards:**
   - Call volume over time
   - Top accounts by call count
   - Video vs audio breakdown

3. **Phase 2: AI Agent** (Future)
   - Follow `SALESFORCE_INTEGRATION_GUIDE.md`
   - Build Python script to analyze transcripts
   - Extract insights (objections, pricing, etc.)

4. **Automate Future Imports:**
   - Run `npm run create-import-csv` monthly
   - Import new transcripts automatically
   - Keep Salesforce up to date

---

## Troubleshooting

**Need help?** Re-run the diagnostic:

```bash
npm run salesforce-check
```

This shows which IDs match between your CSV and Salesforce.

**Want to rebuild the CSV?**

```bash
npm run create-import-csv
```

This regenerates the combined CSV with latest data.

---

## Summary

You successfully created a complete Salesforce import file with:
- All transcript metadata
- Matched Contact/Account names
- Google Drive URLs
- Match status indicators

**Total Time to Import:** 15-30 minutes
**Records Ready:** 157 transcripts
**Match Rate:** 68-71% (very good!)

🎉 **You're ready to import!** 🎉
