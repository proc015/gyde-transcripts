import fs from 'fs';
import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

/**
 * Google Drive Service
 * Handles authentication and file uploads to Google Drive
 */
export class GoogleDriveService {
  constructor(credentialsPath, tokenPath) {
    this.credentialsPath = credentialsPath;
    this.tokenPath = tokenPath;
    this.authClient = null;
  }

  /**
   * Authorize with Google Drive using OAuth
   */
  async authorize() {
    try {
      // Load OAuth credentials
      const credentials = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));
      const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

      const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

      // Check if we have a saved token
      if (fs.existsSync(this.tokenPath)) {
        const token = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
        oAuth2Client.setCredentials(token);
        this.authClient = oAuth2Client;
        return oAuth2Client;
      }

      // If no token, we need to authorize
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
      });

      console.log('\n⚠️  AUTHORIZATION REQUIRED ⚠️');
      console.log('\nPlease authorize this app by visiting this URL:\n');
      console.log(authUrl);
      console.log('\nAfter authorizing, you will get a code.');
      console.log('Paste the code here and press Enter:\n');

      // Wait for user input
      const code = await new Promise((resolve) => {
        process.stdin.once('data', (data) => {
          resolve(data.toString().trim());
        });
      });

      // Get token from code
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);

      // Save token for future use
      fs.writeFileSync(this.tokenPath, JSON.stringify(tokens));
      console.log('\n✓ Token saved! You won\'t need to authorize again.\n');

      this.authClient = oAuth2Client;
      return oAuth2Client;
    } catch (error) {
      console.error('Error authorizing with Google Drive:', error.message);
      throw error;
    }
  }

  /**
   * Upload text content to Google Drive
   */
  async uploadFile(fileName, textContent, folderId) {
    try {
      if (!this.authClient) {
        throw new Error('Not authorized. Call authorize() first.');
      }

      const drive = google.drive({ version: 'v3', auth: this.authClient });

      // Create a readable stream from the text content
      const bufferStream = new Readable();
      bufferStream.push(textContent);
      bufferStream.push(null);

      const fileMetadata = {
        name: fileName,
        parents: [folderId], // Upload to the shared folder
        mimeType: 'text/plain'
      };

      const media = {
        mimeType: 'text/plain',
        body: bufferStream
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink'
      });

      console.log(`    ✓ Uploaded to Google Drive: ${response.data.name}`);
      return response.data;
    } catch (error) {
      console.error(`    ✗ Google Drive upload failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the auth client (for backward compatibility)
   */
  getAuthClient() {
    return this.authClient;
  }
}
