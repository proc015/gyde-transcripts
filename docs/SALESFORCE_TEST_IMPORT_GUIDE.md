# Salesforce Test Import Guide

Complete step-by-step guide for testing transcript import with 5 records before doing the full import.

---

## Phase 1: Create Test Data (5 minutes)

### Step 1: Generate Test CSV

Run the subset script:

```bash
node scripts/create-test-subset.js
```

This creates `data/test_subset.csv` with 5 records and a `GoogleDriveURL` column.

---

### Step 2: Add Google Drive URLs (10-15 minutes)

**Open Google Drive Folder:**
- URL: https://drive.google.com/drive/folders/1Xi4wJIa53MnbPbJP57xhZvlGmFkkL6gi

**For each of the 5 test files:**

1. **Find the file** in Google Drive
   - Use the filename from `test_subset.csv`
   - Example: `transcript_audio_3ebb1629-24b1-4f34-b21d-0fcad4928a59_1763175598172.txt`

2. **Get shareable link:**
   - Right-click the file
   - Click "Share"
   - Click "Copy link"
   - Example URL: `https://drive.google.com/file/d/1abc...xyz/view`

3. **Paste into CSV:**
   - Open `data/test_subset.csv` in Excel or text editor
   - Find the corresponding row
   - Paste the URL in the `GoogleDriveURL` column (last column)

4. **Repeat for all 5 files**

5. **Save the CSV**

**Your CSV should now look like:**
```
ConversationID,Filename,PersonID,PersonCrmID,AccountID,AccountCrmID,MediaType,Platform,Date,Duration,GoogleDriveURL
3ebb1629-24b1...,transcript_audio_3ebb1629...,423146557,003fh0000021Qs6AAE,68119492,001fh000004C8LlAAK,audio,salesloft,2025-11-14T21:43:58.434Z,135000,https://drive.google.com/file/d/1abc...
```

---

## Phase 2: Set Up Salesforce (30 minutes)

### Step 1: Create Custom Object

**Navigate to:**
Setup → Object Manager → Create → Custom Object

**Object Settings:**
- **Label:** Call Transcript
- **Plural Label:** Call Transcripts
- **Object Name:** `Call_Transcript`
- **Record Name:** Transcript Name
- **Data Type:** Auto Number
- **Display Format:** `TRANS-{0000}`
- **Starting Number:** 1

**Deployment Settings:**
- ✅ Allow Reports
- ✅ Allow Activities
- ✅ Track Field History
- ✅ Allow Search

Click **Save**

---

### Step 2: Create Custom Fields

Navigate to: **Call Transcript** → Fields & Relationships → New

Create these fields **in order:**

#### Field 1: Conversation ID
- **Field Label:** Conversation ID
- **Field Name:** `Conversation_ID` (auto-generates as `Conversation_ID__c`)
- **Data Type:** Text
- **Length:** 255
- **Required:** ✅ Yes
- **Unique:** ✅ Yes (select "Do not allow duplicate values")
- **External ID:** ✅ Yes
- Click **Next** → **Next** → **Save & New**

#### Field 2: Transcript Filename
- **Field Label:** Transcript Filename
- **Field Name:** `Transcript_Filename`
- **Data Type:** Text
- **Length:** 255
- **Required:** ✅ Yes
- Click **Next** → **Next** → **Save & New**

#### Field 3: SalesLoft Person ID
- **Field Label:** SalesLoft Person ID
- **Field Name:** `SalesLoft_Person_ID`
- **Data Type:** Text
- **Length:** 50
- **Required:** No
- Click **Next** → **Next** → **Save & New**

#### Field 4: SalesLoft Account ID
- **Field Label:** SalesLoft Account ID
- **Field Name:** `SalesLoft_Account_ID`
- **Data Type:** Text
- **Length:** 50
- **Required:** No
- Click **Next** → **Next** → **Save & New**

#### Field 5: Contact/Lead (Lookup)
- **Field Label:** Contact/Lead
- **Field Name:** `Contact_Lead`
- **Data Type:** Lookup Relationship
- **Related To:** Contact
- **Required:** No
- Click **Next** → **Next** → **Next** → **Save & New**

#### Field 6: Account (Lookup)
- **Field Label:** Account
- **Field Name:** `Account`
- **Data Type:** Lookup Relationship
- **Related To:** Account
- **Required:** No
- Click **Next** → **Next** → **Next** → **Save & New**

#### Field 7: Media Type
- **Field Label:** Media Type
- **Field Name:** `Media_Type`
- **Data Type:** Picklist
- **Values:** (enter one per line)
  ```
  audio
  video
  ```
- **Required:** ✅ Yes
- Click **Next** → **Next** → **Save & New**

#### Field 8: Platform
- **Field Label:** Platform
- **Field Name:** `Platform`
- **Data Type:** Picklist
- **Values:** (enter one per line)
  ```
  salesloft
  zoom
  teams
  ```
- **Required:** ✅ Yes
- Click **Next** → **Next** → **Save & New**

#### Field 9: Call Date
- **Field Label:** Call Date
- **Field Name:** `Call_Date`
- **Data Type:** Date/Time
- **Required:** ✅ Yes
- Click **Next** → **Next** → **Save & New**

#### Field 10: Duration (seconds)
- **Field Label:** Duration (seconds)
- **Field Name:** `Duration_Seconds`
- **Data Type:** Number
- **Length:** 18
- **Decimal Places:** 0
- **Required:** No
- Click **Next** → **Next** → **Save & New**

#### Field 11: Google Drive URL
- **Field Label:** Google Drive URL
- **Field Name:** `Google_Drive_URL`
- **Data Type:** URL
- **Length:** 255
- **Required:** No
- Click **Next** → **Next** → **Save**

---

### Step 3: Make Contact/Lead External ID (Important!)

This allows us to map Salesforce IDs from the CSV.

**For Contact:**
1. Setup → Object Manager → Contact
2. Fields & Relationships → **Id** field
3. Edit the field
4. ✅ Check "External ID"
5. Save

**For Lead (if you use Leads):**
1. Setup → Object Manager → Lead
2. Fields & Relationships → **Id** field
3. Edit the field
4. ✅ Check "External ID"
5. Save

**For Account:**
1. Setup → Object Manager → Account
2. Fields & Relationships → **Id** field
3. Edit the field
4. ✅ Check "External ID"
5. Save

---

## Phase 3: Test Import (10 minutes)

### Method 1: Salesforce Data Import Wizard (Easier)

1. **Setup → Data → Data Import Wizard**

2. **Launch Wizard → Custom Objects → Call Transcripts**

3. **Add New Records**

4. **Choose CSV File:**
   - Upload `data/test_subset.csv`
   - Character Encoding: UTF-8
   - Click **Next**

5. **Map Fields:**

   **Standard Mapping:**
   - Conversation ID → Conversation ID (`Conversation_ID__c`)
   - Filename → Transcript Filename (`Transcript_Filename__c`)
   - PersonID → SalesLoft Person ID (`SalesLoft_Person_ID__c`)
   - AccountID → SalesLoft Account ID (`SalesLoft_Account_ID__c`)
   - MediaType → Media Type (`Media_Type__c`)
   - Platform → Platform (`Platform__c`)
   - Date → Call Date (`Call_Date__c`)
   - Duration → Duration (seconds) (`Duration_Seconds__c`)
   - GoogleDriveURL → Google Drive URL (`Google_Drive_URL__c`)

   **Lookup Relationships:**
   - PersonCrmID → Contact/Lead (`Contact_Lead__c`)
     - **Match by:** Contact: Id (External ID)
     - **If no match:** Leave field blank

   - AccountCrmID → Account (`Account__c`)
     - **Match by:** Account: Id (External ID)
     - **If no match:** Leave field blank

6. **Review & Start Import**

7. **Check Email** for import completion notification

---

### Method 2: Salesforce Data Loader (More Powerful)

**Download & Install:**
1. Setup → Data → Data Loader
2. Download for your OS
3. Install and login with Salesforce credentials

**Import Steps:**

1. **Launch Data Loader → Insert**

2. **Select Object:** `Call Transcript`

3. **Select CSV:** `data/test_subset.csv`

4. **Map Fields** (drag CSV columns to Salesforce fields):

   | CSV Column | Salesforce Field |
   |-----------|------------------|
   | ConversationID | Conversation_ID__c |
   | Filename | Transcript_Filename__c |
   | PersonID | SalesLoft_Person_ID__c |
   | PersonCrmID | Contact_Lead__r.Id |
   | AccountID | SalesLoft_Account_ID__c |
   | AccountCrmID | Account__r.Id |
   | MediaType | Media_Type__c |
   | Platform | Platform__c |
   | Date | Call_Date__c |
   | Duration | Duration_Seconds__c |
   | GoogleDriveURL | Google_Drive_URL__c |

5. **For Lookup Fields:**
   - `Contact_Lead__r.Id`: Use External ID mapping
   - `Account__r.Id`: Use External ID mapping

6. **Finish → Run Import**

7. **Check success.csv and error.csv** in output folder

---

## Phase 4: Verify Success (5 minutes)

### Step 1: Check Import Status

**Navigate to:**
Setup → Data → Data Import History

**Verify:**
- Status: Completed
- Processed: 5
- Failed: 0

---

### Step 2: View Records in Salesforce

**Navigate to:**
App Launcher (9 dots) → Call Transcripts

**You should see 5 records with names like:**
- TRANS-0001
- TRANS-0002
- TRANS-0003
- TRANS-0004
- TRANS-0005

---

### Step 3: Open a Record and Verify

Click on **TRANS-0001** and verify:

**Check Fields:**
- ✅ Conversation ID populated
- ✅ Transcript Filename populated
- ✅ Media Type = audio or video
- ✅ Platform = salesloft or zoom
- ✅ Call Date is correct
- ✅ Duration (seconds) is a number

**Check Lookups:**
- ✅ Contact/Lead field shows a Contact name (if PersonCrmID matched)
- ✅ Account field shows an Account name (if AccountCrmID matched)

**Check Google Drive Link:**
- ✅ Google Drive URL is clickable
- ✅ Click it and verify the transcript opens in Google Drive

---

### Step 4: Run a Test Query (Optional)

**Developer Console → Query Editor:**

```sql
SELECT Id, Name, Conversation_ID__c, Contact_Lead__r.Name,
       Account__r.Name, Media_Type__c, Platform__c,
       Call_Date__c, Google_Drive_URL__c
FROM Call_Transcript__c
LIMIT 5
```

**Verify:**
- All 5 records returned
- Contact/Lead and Account names populated (if matches found)
- All fields have correct values

---

## Decision Point

### ✅ If Test Import Successful:

**You're ready to import all 177 records!**

**Next Steps:**
1. Create full CSV with Google Drive URLs (see option below)
2. Run full import using same process
3. Verify all 177 records imported

**Option A: Manual URL Addition (Time-consuming)**
- Open Google Drive
- Get links for all 177 files
- Add to full CSV manually

**Option B: Automated Script (Recommended)**
- Run the automated script from `SALESFORCE_INTEGRATION_GUIDE.md`
- Script automatically fetches URLs from Google Drive API
- Creates `transcript_salesforce_mapping_with_urls.csv`
- Ready for immediate import

---

### ❌ If Test Import Had Issues:

**Common Problems & Solutions:**

**Problem 1: Lookup fields not populated**
- **Cause:** PersonCrmID or AccountCrmID values don't match any Contact/Account IDs in Salesforce
- **Solution:**
  - Check if Contacts/Accounts exist in Salesforce
  - Verify CRM IDs are correct
  - It's OK if some are blank - you can update later

**Problem 2: Date format error**
- **Cause:** Date format not recognized
- **Solution:**
  - Change CSV date format to: `YYYY-MM-DD HH:MM:SS`
  - Example: `2025-11-14 21:43:58`

**Problem 3: Picklist value errors**
- **Cause:** MediaType or Platform values don't match picklist
- **Solution:**
  - Check all values are lowercase
  - Add any missing values to picklist

**Problem 4: Duplicate Conversation IDs**
- **Cause:** Trying to import a record that already exists
- **Solution:**
  - Delete test records and try again
  - Or use "Update" instead of "Insert"

**Problem 5: Google Drive links not clickable**
- **Cause:** URL format issue
- **Solution:**
  - Ensure URLs start with `https://`
  - Check no extra spaces or characters

---

## Next Steps After Successful Test

1. ✅ You now have 5 test records in Salesforce
2. 🚀 Ready to import all 177 records
3. 🤖 Can start building AI agent for insights (Phase 2)

---

## Summary

You've completed:
- ✅ Created Salesforce Call Transcript object
- ✅ Added all custom fields
- ✅ Imported 5 test records
- ✅ Verified data looks correct
- ✅ Confirmed Google Drive links work

**Total Time:** ~1 hour

**You now have transcripts in Salesforce linked to Contacts, Accounts, and Google Drive!** 🎉
