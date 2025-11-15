# Salesforce Integration & AI Agent Guide

Complete guide for importing SalesLoft call transcripts into Salesforce and building an AI agent to extract insights.

---

## Table of Contents
1. [Part 1: Import Transcripts to Salesforce](#part-1-import-transcripts-to-salesforce)
2. [Part 2: Build AI Agent for Insights](#part-2-build-ai-agent-for-insights)
3. [Part 3: Example Use Cases](#part-3-example-use-cases)

---

## Part 1: Import Transcripts to Salesforce

### Step 1: Create Custom Object in Salesforce

**Navigate to:** Setup → Object Manager → Create → Custom Object

**Object Settings:**
- **Label:** Call Transcript
- **Plural Label:** Call Transcripts
- **Object Name:** Call_Transcript
- **Record Name:** Transcript Name
- **Data Type:** Auto Number
- **Display Format:** TRANS-{0000}
- **Starting Number:** 1

**Deployment Settings:**
- ✅ Allow Reports
- ✅ Allow Activities
- ✅ Track Field History
- ✅ Allow Search

Click **Save**

---

### Step 2: Create Custom Fields

Navigate to the new Call Transcript object → Fields & Relationships

**Create these fields:**

| Field Label | Field Name | Data Type | Length/Details | Required |
|------------|------------|-----------|----------------|----------|
| Conversation ID | Conversation_ID__c | Text | 255 | Yes |
| Transcript Filename | Transcript_Filename__c | Text | 255 | Yes |
| SalesLoft Person ID | SalesLoft_Person_ID__c | Text | 50 | No |
| SalesLoft Account ID | SalesLoft_Account_ID__c | Text | 50 | No |
| Contact/Lead | Contact_Lead__c | Lookup (Contact) | - | No |
| Account | Account__c | Lookup (Account) | - | No |
| Media Type | Media_Type__c | Picklist | Values: audio, video | Yes |
| Platform | Platform__c | Picklist | Values: salesloft, zoom, teams | Yes |
| Call Date | Call_Date__c | Date/Time | - | Yes |
| Duration (seconds) | Duration_Seconds__c | Number | 18, 0 | No |
| Duration (formatted) | Duration_Formatted__c | Formula (Text) | See formula below | No |
| Google Drive URL | Google_Drive_URL__c | URL | 255 | No |
| Transcript Preview | Transcript_Preview__c | Long Text Area | 32,768 | No |

**Duration Formatted Formula:**
```
TEXT(FLOOR(Duration_Seconds__c / 60)) & ":" &
IF(MOD(Duration_Seconds__c, 60) < 10, "0", "") &
TEXT(MOD(Duration_Seconds__c, 60))
```

---

### Step 3: Prepare CSV with Google Drive URLs

Your current CSV has this structure:
```
ConversationID,Filename,PersonID,PersonCrmID,AccountID,AccountCrmID,MediaType,Platform,Date,Duration
```

You need to add a Google Drive URL column. Here's how:

**Option A: Manual (for testing)**
1. Open Google Drive folder
2. Right-click a file → Get link → Copy link
3. Paste into new "GoogleDriveURL" column in CSV

**Option B: Automated Script (Recommended)**

I'll create a script that automatically adds Google Drive URLs to your CSV.

Save this as `add-gdrive-urls.js`:

```javascript
#!/usr/bin/env node

import dotenv from 'dotenv';
import fs from 'fs';
import { google } from 'googleapis';

dotenv.config();

const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const CSV_INPUT = './transcript_salesforce_mapping.csv';
const CSV_OUTPUT = './transcript_salesforce_mapping_with_urls.csv';
const TOKEN_PATH = './token.json';
const OAUTH_CREDENTIALS_PATH = './oauth_credentials.json';

async function authorizeGoogleDrive() {
  const credentials = JSON.parse(fs.readFileSync(OAUTH_CREDENTIALS_PATH, 'utf8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

async function listAllFiles(authClient) {
  const drive = google.drive({ version: 'v3', auth: authClient });
  let allFiles = [];
  let pageToken = null;

  do {
    const response = await drive.files.list({
      q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false`,
      fields: 'nextPageToken, files(id, name, webViewLink)',
      pageSize: 1000,
      pageToken: pageToken
    });
    allFiles = allFiles.concat(response.data.files);
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return allFiles;
}

async function main() {
  console.log('Adding Google Drive URLs to CSV...\n');

  // Authorize
  const authClient = await authorizeGoogleDrive();

  // Get all files from Google Drive
  console.log('Fetching files from Google Drive...');
  const driveFiles = await listAllFiles(authClient);
  console.log(`Found ${driveFiles.length} files in Google Drive\n`);

  // Create filename -> URL mapping
  const fileMap = new Map();
  driveFiles.forEach(file => {
    fileMap.set(file.name, file.webViewLink);
  });

  // Read CSV
  const csvContent = fs.readFileSync(CSV_INPUT, 'utf8');
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');

  // Add GoogleDriveURL header
  const newHeaders = [...headers, 'GoogleDriveURL'].join(',');
  const newLines = [newHeaders];

  // Process each row
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const row = lines[i].split(',');
    const filename = row[1]; // Filename is column 2
    const driveUrl = fileMap.get(filename) || '';

    newLines.push([...row, driveUrl].join(','));
  }

  // Write new CSV
  fs.writeFileSync(CSV_OUTPUT, newLines.join('\n'));
  console.log(`✓ Created ${CSV_OUTPUT}`);
  console.log(`✓ Added Google Drive URLs to ${newLines.length - 1} records\n`);
}

main().catch(console.error);
```

**Run it:**
```bash
node add-gdrive-urls.js
```

This creates `transcript_salesforce_mapping_with_urls.csv` with Google Drive URLs.

---

### Step 4: Import Data to Salesforce

**Method A: Salesforce Data Loader (Recommended)**

**Download & Install:**
1. Download from: Setup → Data → Data Loader
2. Install and login with your Salesforce credentials

**Import Steps:**

1. **Launch Data Loader** → Click "Insert"

2. **Select Object:** Choose "Call Transcript"

3. **Select CSV:** Choose `transcript_salesforce_mapping_with_urls.csv`

4. **Map Fields:**

   | CSV Column | Salesforce Field |
   |-----------|------------------|
   | ConversationID | Conversation_ID__c |
   | Filename | Transcript_Filename__c |
   | PersonID | SalesLoft_Person_ID__c |
   | PersonCrmID | Contact_Lead__r.Id (External ID) |
   | AccountID | SalesLoft_Account_ID__c |
   | AccountCrmID | Account__r.Id (External ID) |
   | MediaType | Media_Type__c |
   | Platform | Platform__c |
   | Date | Call_Date__c |
   | Duration | Duration_Seconds__c |
   | GoogleDriveURL | Google_Drive_URL__c |

5. **Map Lookup Relationships:**
   - For `Contact_Lead__r.Id`: Use **External ID** mapping
   - External ID field: `Contact.Id` or `Lead.Id`
   - CSV column: `PersonCrmID`

   - For `Account__r.Id`: Use **External ID** mapping
   - External ID field: `Account.Id`
   - CSV column: `AccountCrmID`

6. **Run Import** → Review success/error logs

**Method B: Salesforce Data Import Wizard (Simpler, Limited)**

1. Setup → Data → Data Import Wizard
2. Launch Wizard → Custom Objects → Call Transcripts
3. Upload CSV
4. Map fields (similar to above)
5. Start Import

**Note:** Data Import Wizard has a 50,000 record limit. Use Data Loader for larger imports.

---

### Step 5: Verify Import

**Check Import Success:**
```
Setup → Data → Data Import History
```

**Run SOQL Query in Developer Console:**
```sql
SELECT Id, Name, Conversation_ID__c, Contact_Lead__r.Name,
       Account__r.Name, Media_Type__c, Call_Date__c, Google_Drive_URL__c
FROM Call_Transcript__c
LIMIT 10
```

**Verify Relationships:**
- Open a Call Transcript record
- Check that Contact/Lead and Account lookups are populated
- Click Google Drive URL to verify link works

---

## Part 2: Build AI Agent for Insights

### Architecture Overview

```
User Question
    ↓
Salesforce Query (SOQL)
    ↓
Get Call Transcript Records
    ↓
Extract Google Drive URLs
    ↓
HTTP Request to Google Drive API
    ↓
Download Transcript Text
    ↓
Send to LLM (OpenAI/Claude)
    ↓
Return Insights
```

---

### Prerequisites

1. **Salesforce Connected App** (for API access)
2. **Google Cloud Service Account** (for Drive API)
3. **OpenAI or Anthropic API Key** (for LLM)

---

### Step 1: Set Up Salesforce API Access

**Create Connected App:**

1. Setup → App Manager → New Connected App
2. Basic Information:
   - Connected App Name: `Transcript Insights Agent`
   - API Name: `Transcript_Insights_Agent`
   - Contact Email: your@email.com

3. API (Enable OAuth Settings):
   - ✅ Enable OAuth Settings
   - Callback URL: `http://localhost:8080/callback`
   - Selected OAuth Scopes:
     - Full access (full)
     - Perform requests at any time (refresh_token, offline_access)

4. Save → Copy **Consumer Key** and **Consumer Secret**

---

### Step 2: Python Agent Implementation

**Install Dependencies:**
```bash
pip install simple-salesforce google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client openai anthropic python-dotenv
```

**Create `.env` file:**
```env
# Salesforce
SALESFORCE_USERNAME=your@email.com
SALESFORCE_PASSWORD=yourpassword
SALESFORCE_SECURITY_TOKEN=yoursecuritytoken
SALESFORCE_DOMAIN=login  # or 'test' for sandbox

# Google Drive
GOOGLE_SERVICE_ACCOUNT_FILE=./service-account.json

# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic (alternative)
ANTHROPIC_API_KEY=sk-ant-...
```

**Create `transcript_agent.py`:**

```python
#!/usr/bin/env python3
"""
AI Agent for Call Transcript Insights
Queries Salesforce, fetches transcripts from Google Drive, analyzes with LLM
"""

import os
import re
from dotenv import load_dotenv
from simple_salesforce import Salesforce
from google.oauth2 import service_account
from googleapiclient.discovery import build
import openai  # or use anthropic

load_dotenv()

# Initialize Salesforce
sf = Salesforce(
    username=os.getenv('SALESFORCE_USERNAME'),
    password=os.getenv('SALESFORCE_PASSWORD'),
    security_token=os.getenv('SALESFORCE_SECURITY_TOKEN'),
    domain=os.getenv('SALESFORCE_DOMAIN', 'login')
)

# Initialize Google Drive
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
creds = service_account.Credentials.from_service_account_file(
    os.getenv('GOOGLE_SERVICE_ACCOUNT_FILE'),
    scopes=SCOPES
)
drive_service = build('drive', 'v3', credentials=creds)

# Initialize OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')


def extract_file_id_from_url(url):
    """Extract Google Drive file ID from URL"""
    match = re.search(r'/d/([a-zA-Z0-9-_]+)', url)
    if match:
        return match.group(1)
    return None


def download_transcript_from_gdrive(file_id):
    """Download transcript text from Google Drive"""
    try:
        request = drive_service.files().get_media(fileId=file_id)
        content = request.execute()
        return content.decode('utf-8')
    except Exception as e:
        print(f"Error downloading file {file_id}: {e}")
        return None


def query_transcripts_by_contact(contact_name):
    """Query Salesforce for all transcripts related to a contact"""
    soql = f"""
        SELECT Id, Name, Conversation_ID__c, Contact_Lead__r.Name,
               Account__r.Name, Media_Type__c, Platform__c,
               Call_Date__c, Duration_Formatted__c, Google_Drive_URL__c
        FROM Call_Transcript__c
        WHERE Contact_Lead__r.Name LIKE '%{contact_name}%'
        ORDER BY Call_Date__c DESC
    """

    results = sf.query(soql)
    return results['records']


def query_transcripts_by_account(account_name):
    """Query Salesforce for all transcripts related to an account"""
    soql = f"""
        SELECT Id, Name, Conversation_ID__c, Contact_Lead__r.Name,
               Account__r.Name, Media_Type__c, Platform__c,
               Call_Date__c, Duration_Formatted__c, Google_Drive_URL__c
        FROM Call_Transcript__c
        WHERE Account__r.Name LIKE '%{account_name}%'
        ORDER BY Call_Date__c DESC
    """

    results = sf.query(soql)
    return results['records']


def analyze_transcript_with_llm(transcript_text, question):
    """Send transcript to LLM for analysis"""

    prompt = f"""You are analyzing a sales call transcript.

TRANSCRIPT:
{transcript_text}

QUESTION:
{question}

Please provide a detailed, actionable answer based on the transcript content."""

    response = openai.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a sales analyst helping to extract insights from call transcripts."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=1000
    )

    return response.choices[0].message.content


def get_insights_for_contact(contact_name, question):
    """Main function: Get insights from all transcripts for a contact"""

    print(f"\n🔍 Searching for transcripts with contact: {contact_name}...")

    # Query Salesforce
    transcripts = query_transcripts_by_contact(contact_name)

    if not transcripts:
        return f"No transcripts found for contact: {contact_name}"

    print(f"✓ Found {len(transcripts)} transcript(s)\n")

    all_insights = []

    for transcript in transcripts:
        print(f"📄 Analyzing: {transcript['Name']} ({transcript['Call_Date__c']})")

        # Get Google Drive URL
        gdrive_url = transcript.get('Google_Drive_URL__c')
        if not gdrive_url:
            print("  ⚠️  No Google Drive URL - skipping")
            continue

        # Extract file ID and download
        file_id = extract_file_id_from_url(gdrive_url)
        if not file_id:
            print("  ⚠️  Invalid Google Drive URL - skipping")
            continue

        transcript_text = download_transcript_from_gdrive(file_id)
        if not transcript_text:
            print("  ⚠️  Failed to download transcript - skipping")
            continue

        print(f"  ✓ Downloaded transcript ({len(transcript_text)} chars)")

        # Analyze with LLM
        print(f"  🤖 Analyzing with AI...")
        insight = analyze_transcript_with_llm(transcript_text, question)

        all_insights.append({
            'call_name': transcript['Name'],
            'call_date': transcript['Call_Date__c'],
            'contact': transcript['Contact_Lead__r']['Name'] if transcript.get('Contact_Lead__r') else 'N/A',
            'account': transcript['Account__r']['Name'] if transcript.get('Account__r') else 'N/A',
            'insight': insight
        })

        print(f"  ✓ Analysis complete\n")

    return all_insights


def main():
    """Example usage"""

    # Example 1: Find objections from a specific contact
    contact = "Linda Morrison"
    question = "What objections or concerns did the prospect raise during this call?"

    insights = get_insights_for_contact(contact, question)

    if isinstance(insights, str):
        print(insights)
    else:
        print(f"\n{'='*60}")
        print(f"INSIGHTS FOR: {contact}")
        print(f"QUESTION: {question}")
        print(f"{'='*60}\n")

        for i, insight in enumerate(insights, 1):
            print(f"Call {i}: {insight['call_name']}")
            print(f"Date: {insight['call_date']}")
            print(f"Contact: {insight['contact']}")
            print(f"Account: {insight['account']}")
            print(f"\nInsight:")
            print(insight['insight'])
            print(f"\n{'-'*60}\n")


if __name__ == "__main__":
    main()
```

---

### Step 3: Google Drive Service Account Setup

**Create Service Account:**

1. Go to: https://console.cloud.google.com
2. Select your project (or create new)
3. Navigate to: IAM & Admin → Service Accounts
4. Create Service Account:
   - Name: `transcript-agent`
   - Role: `Viewer`
5. Create Key → JSON → Download as `service-account.json`

**Share Google Drive Folder with Service Account:**

1. Open your Google Drive folder (ID: `1Xi4wJIa53MnbPbJP57xhZvlGmFkkL6gi`)
2. Click Share
3. Add the service account email (e.g., `transcript-agent@project.iam.gserviceaccount.com`)
4. Give it `Viewer` access

---

### Step 4: Run the Agent

```bash
python transcript_agent.py
```

**Example Output:**
```
🔍 Searching for transcripts with contact: Linda Morrison...
✓ Found 2 transcript(s)

📄 Analyzing: TRANS-0042 (2025-11-14T21:25:36.919Z)
  ✓ Downloaded transcript (3542 chars)
  🤖 Analyzing with AI...
  ✓ Analysis complete

============================================================
INSIGHTS FOR: Linda Morrison
QUESTION: What objections or concerns did the prospect raise?
============================================================

Call 1: TRANS-0042
Date: 2025-11-14T21:25:36.919Z
Contact: Linda Morrison
Account: Morrison Insurance Group PC

Insight:
The prospect raised the following objections:
1. Pricing concerns - mentioned competitor pricing was lower
2. Implementation timeline - wanted faster onboarding
3. Contract length - preferred month-to-month instead of annual
```

---

## Part 3: Example Use Cases

### Use Case 1: Extract Objections from All Calls with an Account

```python
# In transcript_agent.py, add:

def analyze_all_account_calls(account_name):
    """Analyze all calls for an account"""
    transcripts = query_transcripts_by_account(account_name)

    all_objections = []
    for transcript in transcripts:
        # Download and analyze each transcript
        # Extract objections
        pass

    return all_objections

# Usage:
objections = analyze_all_account_calls("Morrison Insurance Group")
```

### Use Case 2: Summarize Pricing Discussions

```python
question = "What pricing was discussed in this call? Include any numbers mentioned."
insights = get_insights_for_contact("John Smith", question)
```

### Use Case 3: Identify Next Steps

```python
question = "What next steps or action items were agreed upon in this call?"
insights = get_insights_for_contact("Sarah Johnson", question)
```

### Use Case 4: Competitor Mentions

```python
def find_competitor_mentions():
    """Find all transcripts mentioning competitors"""
    soql = """
        SELECT Id, Name, Contact_Lead__r.Name, Account__r.Name,
               Google_Drive_URL__c
        FROM Call_Transcript__c
    """

    results = sf.query(soql)

    competitors_found = []
    for record in results['records']:
        file_id = extract_file_id_from_url(record['Google_Drive_URL__c'])
        transcript = download_transcript_from_gdrive(file_id)

        # Check for competitor keywords
        if any(comp in transcript.lower() for comp in ['competitor', 'alternative', 'other provider']):
            insight = analyze_transcript_with_llm(
                transcript,
                "Which competitors were mentioned and what was said about them?"
            )
            competitors_found.append({
                'account': record['Account__r']['Name'],
                'insight': insight
            })

    return competitors_found
```

---

## Advanced: Slack Bot Integration

Want to make this a Slack bot so sales reps can ask questions?

**Add Slack Integration:**

```python
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler

app = App(token=os.getenv("SLACK_BOT_TOKEN"))

@app.message(re.compile("(analyze|insights|objections)"))
def handle_analysis_request(message, say):
    """Handle Slack messages requesting analysis"""
    text = message['text']

    # Example: "Get objections for contact Linda Morrison"
    if 'contact' in text.lower():
        contact_match = re.search(r'contact\s+(.+)', text, re.IGNORECASE)
        if contact_match:
            contact_name = contact_match.group(1)
            question = "What objections did the prospect raise?"

            say(f"🔍 Searching for transcripts with {contact_name}...")

            insights = get_insights_for_contact(contact_name, question)

            # Format and send insights
            say(format_insights_for_slack(insights))

if __name__ == "__main__":
    handler = SocketModeHandler(app, os.getenv("SLACK_APP_TOKEN"))
    handler.start()
```

---

## Troubleshooting

**Issue: Can't access Google Drive files**
- Verify service account has Viewer access to folder
- Check file permissions are shared with service account email

**Issue: Salesforce query returns empty**
- Verify import completed successfully
- Check field names match (API names end with `__c`)
- Use Developer Console to test SOQL queries

**Issue: LLM responses are generic**
- Increase transcript context (reduce summarization)
- Adjust temperature (lower = more focused)
- Improve prompt engineering

**Issue: Slow performance**
- Cache transcript downloads locally
- Use async/parallel processing for multiple transcripts
- Consider moving to vector database (Pinecone) for faster search

---

## Next Steps

1. ✅ Import transcripts to Salesforce
2. ✅ Test Python agent locally
3. 🚀 Deploy agent as API endpoint (FastAPI/Flask)
4. 🚀 Build Slack bot for sales team
5. 🚀 Add vector database for semantic search
6. 🚀 Create Salesforce Lightning Component for in-app insights

---

## Summary

You now have:
- ✅ 177 transcripts in Google Drive with Salesforce IDs
- ✅ CSV mapping file ready for import
- ✅ Complete Salesforce setup instructions
- ✅ Python AI agent for extracting insights
- ✅ HTTP-based architecture (queries SF → fetches from Drive → analyzes with LLM)

**Total Cost:** ~$0.10-0.50 per analysis (OpenAI GPT-4 pricing)

Your sales team can now ask questions about any call transcript and get AI-powered insights linked to Salesforce records!
