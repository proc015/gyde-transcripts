# Safe Salesforce Import - Exact Step-by-Step Instructions

## SAFETY FIRST

**This is 100% SAFE because:**
- ✅ You're creating a NEW custom object (not touching existing data)
- ✅ This won't modify any Contacts, Accounts, or existing records
- ✅ You can delete everything if you don't like it
- ✅ No risk to your team's existing Salesforce setup

**What we're doing:**
Creating a new "Call Transcripts" database table in Salesforce to store links to your Google Drive transcripts.

---

## PART 1: Create the Custom Object (One-Time Setup)

**Time:** 10-15 minutes
**Risk:** None - you can delete this object anytime

### Step 1.1: Create the Object

1. Log into Salesforce
2. Click the **gear icon** (⚙️) in top right → **Setup**
3. In the left sidebar search box, type: `Object Manager`
4. Click **Object Manager**
5. Click the **Create** dropdown (top right) → **Custom Object**

### Step 1.2: Fill in Basic Info

**Exactly copy these settings:**

| Field | What to Enter |
|-------|---------------|
| **Label** | `Call Transcript` |
| **Plural Label** | `Call Transcripts` |
| **Object Name** | `Call_Transcript` (auto-fills) |
| **Record Name** | `Call Transcript Name` |
| **Data Type** | Select **Auto Number** |
| **Display Format** | `TRANS-{00000}` |
| **Starting Number** | `1` |

**Leave everything else as default.**

6. Scroll down and check these boxes:
   - ✅ **Allow Reports**
   - ✅ **Allow Activities**
   - ✅ **Track Field History**
   - ✅ **Allow Search**

7. Click **Save**

✅ **You just created the object! Now we add fields...**

---

### Step 1.3: Add Custom Fields

You should now see the "Call Transcript" object details page.

**Click the "Fields & Relationships" tab** (if not already there)

Now we'll add 11 fields. For each field below, click **New** and follow the exact steps:

---

#### Field 1: Google Drive URL (THE IMPORTANT ONE)

1. Click **New**
2. **Data Type:** Select `URL`
3. Click **Next**
4. Fill in:
   - **Field Label:** `Google Drive URL`
   - **Field Name:** `Google_Drive_URL` (auto-fills)
   - **Length:** `255`
5. Click **Next**
6. Click **Next** (keep all defaults)
7. Click **Save & New**

---

#### Field 2: Conversation ID

1. **Data Type:** Select `Text`
2. Click **Next**
3. Fill in:
   - **Field Label:** `Conversation ID`
   - **Field Name:** `Conversation_ID`
   - **Length:** `50`
   - ✅ Check **Unique**
   - ✅ Check **External ID**
   - Select **Treat "ABC" and "abc" as duplicate values (case insensitive)**
4. Click **Next**
5. Click **Next**
6. Click **Save & New**

---

#### Field 3: Transcript Filename

1. **Data Type:** Select `Text`
2. Click **Next**
3. Fill in:
   - **Field Label:** `Transcript Filename`
   - **Field Name:** `Transcript_Filename`
   - **Length:** `255`
4. Click **Next**
5. Click **Next**
6. Click **Save & New**

---

#### Field 4: Contact/Lead

1. **Data Type:** Select `Lookup Relationship`
2. Click **Next**
3. **Related To:** Select `Contact` from dropdown
4. Click **Next**
5. Fill in:
   - **Field Label:** `Contact/Lead`
   - **Field Name:** `Contact_Lead`
6. Click **Next**
7. Click **Next** (keep defaults)
8. Click **Next** (keep defaults)
9. Click **Save & New**

---

#### Field 5: Account

1. **Data Type:** Select `Lookup Relationship`
2. Click **Next**
3. **Related To:** Select `Account` from dropdown
4. Click **Next**
5. Fill in:
   - **Field Label:** `Account`
   - **Field Name:** `Account`
6. Click **Next**
7. Click **Next** (keep defaults)
8. Click **Next** (keep defaults)
9. Click **Save & New**

---

#### Field 6: SalesLoft Person ID

1. **Data Type:** Select `Text`
2. Click **Next**
3. Fill in:
   - **Field Label:** `SalesLoft Person ID`
   - **Field Name:** `SalesLoft_Person_ID`
   - **Length:** `50`
4. Click **Next**
5. Click **Next**
6. Click **Save & New**

---

#### Field 7: SalesLoft Account ID

1. **Data Type:** Select `Text`
2. Click **Next**
3. Fill in:
   - **Field Label:** `SalesLoft Account ID`
   - **Field Name:** `SalesLoft_Account_ID`
   - **Length:** `50`
4. Click **Next**
5. Click **Next**
6. Click **Save & New**

---

#### Field 8: Media Type

1. **Data Type:** Select `Picklist`
2. Click **Next**
3. Fill in:
   - **Field Label:** `Media Type`
   - **Field Name:** `Media_Type`
4. In the **Values** box, enter (one per line):
   ```
   audio
   video
   ```
5. Click **Next**
6. Click **Next**
7. Click **Save & New**

---

#### Field 9: Platform

1. **Data Type:** Select `Picklist`
2. Click **Next**
3. Fill in:
   - **Field Label:** `Platform`
   - **Field Name:** `Platform`
4. In the **Values** box, enter (one per line):
   ```
   salesloft
   zoom
   ```
5. Click **Next**
6. Click **Next**
7. Click **Save & New**

---

#### Field 10: Call Date

1. **Data Type:** Select `Date/Time`
2. Click **Next**
3. Fill in:
   - **Field Label:** `Call Date`
   - **Field Name:** `Call_Date`
4. Click **Next**
5. Click **Next**
6. Click **Save & New**

---

#### Field 11: Duration (seconds)

1. **Data Type:** Select `Number`
2. Click **Next**
3. Fill in:
   - **Field Label:** `Duration (seconds)`
   - **Field Name:** `Duration_seconds`
   - **Length:** `10`
   - **Decimal Places:** `0`
4. Click **Next**
5. Click **Next**
6. Click **Save** (last one, no "& New")

---

✅ **DONE! You've created all 11 fields.**

---

### Step 1.4: Set Up External IDs (IMPORTANT for matching)

Now we need to make Contact.Id and Account.Id searchable for import matching.

#### For Contact:

1. In Setup, search for: `Object Manager`
2. Click **Contact**
3. Click **Fields & Relationships** tab
4. Find the field named **Contact ID** (the system one, not custom)
5. Click **Set Field-Level Security**
6. Make sure it's visible to your profile
7. Click **OK**

**Actually, skip this step** - Salesforce's built-in Id field is already available for External ID matching in Data Import Wizard.

---

## PART 2: Import Your Data

**Time:** 10 minutes
**Risk:** None - this only adds new records to YOUR new object

### Step 2.1: Open Data Import Wizard

1. In Setup, search for: `Data Import Wizard`
2. Click **Data Import Wizard**
3. Click **Launch Wizard!** button

### Step 2.2: Choose What to Import

1. Click **Custom objects** tab
2. Select **Call Transcripts** from the dropdown
3. Select **Add new records**
4. Click **Next**

### Step 2.3: Upload Your CSV

1. Click **Choose File**
2. Navigate to: `/Users/proc/Documents/Repos/gyde-transcripts/data/salesforce_import_ready.csv`
3. Select the file
4. **Character Encoding:** Keep as `UTF-8`
5. Click **Next**

### Step 2.4: Map Your Fields

Salesforce will try to auto-match. **Verify these mappings:**

| CSV Column Header | Maps To Salesforce Field |
|-------------------|-------------------------|
| ConversationID | Conversation ID |
| Filename | Transcript Filename |
| PersonID | SalesLoft Person ID |
| PersonCrmID | Contact/Lead → **IMPORTANT: Choose "Contact: Contact ID"** |
| AccountID | SalesLoft Account ID |
| AccountCrmID | Account → **IMPORTANT: Choose "Account: Account ID"** |
| MediaType | Media Type |
| Platform | Platform |
| Date | Call Date |
| Duration | Duration (seconds) |
| GoogleDriveURL | Google Drive URL |

**CRITICAL STEP for PersonCrmID and AccountCrmID:**
- When mapping **PersonCrmID**: Click the dropdown → Select **"Match by External ID"** → Choose **"Contact: Contact ID"**
- When mapping **AccountCrmID**: Click the dropdown → Select **"Match by External ID"** → Choose **"Account: Account ID"**

**Ignore these columns** (don't map them):
- ContactName
- ContactEmail
- ContactMatchStatus
- AccountName
- AccountMatchStatus

Click **Next**

### Step 2.5: Review & Import

1. Review the summary
   - Should show: **157 records will be imported**
2. Click **Start Import**
3. You'll see: "Your import has started!"
4. Click **OK**

**Wait 5-10 minutes.** Salesforce will email you when done.

---

## PART 3: Verify It Worked

### Step 3.1: Check Import Status

1. Go to **Setup → Data → Data Import History**
2. Look for your import at the top
3. Verify:
   - **Status:** Completed
   - **Records Processed:** 157
   - **Records Failed:** 0

### Step 3.2: View Your Records

1. Click the **App Launcher** (9 dots, top left)
2. Search for: `Call Transcripts`
3. Click **Call Transcripts**
4. You should see a list of records: TRANS-00001, TRANS-00002, etc.

### Step 3.3: Test a Google Drive Link

1. Click on any record (e.g., TRANS-00001)
2. Scroll down to find **Google Drive URL** field
3. You should see a **blue clickable link**
4. Click it → Your Google Drive transcript should open in a new tab

**If the link works, YOU'RE DONE! ✅**

---

## What If Something Goes Wrong?

### Delete Everything and Start Over

**If you need to undo everything:**

1. Go to **Setup → Object Manager**
2. Find **Call Transcript**
3. Click the dropdown arrow → **Delete**
4. Confirm deletion
5. Start over from Part 1

**This will delete:**
- The custom object
- All 157 imported records
- All the fields

**This will NOT affect:**
- Your Contacts
- Your Accounts
- Any other Salesforce data

---

## Safety Checklist

Before you start, verify:

- [ ] You're logged into the CORRECT Salesforce org
- [ ] You have "Customize Application" permission
- [ ] You have the CSV file: `data/salesforce_import_ready.csv`
- [ ] You've read through these instructions once

---

## Questions?

**"Will this mess up my team's Salesforce?"**
No. You're creating a separate custom object. It's like adding a new tab.

**"Can I delete this later?"**
Yes. Delete the custom object and everything disappears.

**"What if the import fails?"**
Check the error log in Data Import History. Most common issue: field mapping. Just delete the records and re-import.

**"Will my team see this?"**
Yes, if they have permission. You can control who sees it via Profiles & Permission Sets later.

**"What about the 50 records that didn't match Contacts/Accounts?"**
They'll still import! They just won't have a Contact/Account linked. The Google Drive URL will still work.

---

## Summary

**What you're doing:**
1. Creating 1 new custom object (Call Transcript)
2. Adding 11 fields to it
3. Importing 157 records from a CSV
4. Google Drive URLs will automatically be clickable links

**Time:** 25-30 minutes total
**Risk:** Zero - completely reversible
**Result:** 157 call transcripts with clickable Google Drive links in Salesforce

🎉 **You got this!** Follow the steps exactly and you'll be fine.
