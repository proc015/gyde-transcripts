import fs from 'fs';
import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

/**
 * Google Drive Service
 * Handles authentication and file uploads to Google Drive
 * Supports both OAuth (local) and Service Account (GitHub Actions)
 */
export class GoogleDriveService {
  constructor(credentialsPath, tokenPath) {
    this.credentialsPath = credentialsPath;
    this.tokenPath = tokenPath;
    this.authClient = null;
  }

  /**
   * Authorize with Google Drive
   * Auto-detects: Service Account (if GOOGLE_SERVICE_ACCOUNT_KEY env var exists) or OAuth
   */
  async authorize() {
    try {
      // Check if service account key is provided (for GitHub Actions)
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        return await this.authorizeServiceAccount();
      }

      // Otherwise use OAuth (for local development)
      return await this.authorizeOAuth();
    } catch (error) {
      console.error('Error authorizing with Google Drive:', error.message);
      throw error;
    }
  }

  /**
   * Authorize using Service Account OR OAuth from env vars (for GitHub Actions)
   */
  async authorizeServiceAccount() {
    try {
      // Check if OAuth credentials are provided in env vars (preferred for GitHub Actions)
      if (process.env.GOOGLE_OAUTH_CLIENT_ID &&
          process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
          process.env.GOOGLE_OAUTH_REFRESH_TOKEN) {

        console.log('🔐 Using OAuth authentication (from env vars)...');

        const oAuth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_OAUTH_CLIENT_ID,
          process.env.GOOGLE_OAUTH_CLIENT_SECRET,
          'http://localhost' // redirect URI (not used for refresh)
        );

        // Set refresh token to get new access tokens automatically
        oAuth2Client.setCredentials({
          refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN
        });

        this.authClient = oAuth2Client;
        console.log('✓ OAuth authenticated successfully (from env)');
        return this.authClient;
      }

      // Fallback to service account
      console.log('🔐 Using Service Account authentication...');

      // Parse service account key from environment variable
      const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

      // Create JWT auth client
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountKey,
        scopes: SCOPES,
      });

      this.authClient = await auth.getClient();
      console.log('✓ Service Account authenticated successfully');

      return this.authClient;
    } catch (error) {
      console.error('Authentication failed:', error.message);
      throw error;
    }
  }

  /**
   * Authorize using OAuth (for local development)
   */
  async authorizeOAuth() {
    try {
      console.log('🔐 Using OAuth authentication...');

      // Load OAuth credentials
      const credentials = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));
      const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

      const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

      // Check if we have a saved token
      if (fs.existsSync(this.tokenPath)) {
        const token = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
        oAuth2Client.setCredentials(token);
        this.authClient = oAuth2Client;
        console.log('✓ OAuth token loaded successfully');
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
      console.error('OAuth authentication failed:', error.message);
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
