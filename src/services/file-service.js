import fs from 'fs';
import path from 'path';

/**
 * File Service
 * Handles local file operations including saving transcripts and CSV mapping
 */
export class FileService {
  constructor(processedIdsFile, legacyProcessedIdsFile, mappingCsvFile, downloadFolder) {
    this.processedIdsFile = processedIdsFile;
    this.legacyProcessedIdsFile = legacyProcessedIdsFile;
    this.mappingCsvFile = mappingCsvFile;
    this.downloadFolder = downloadFolder;
  }

  /**
   * Load processed conversation IDs and pagination state from file
   * Also checks for legacy call IDs file and merges them
   */
  loadProcessedIds() {
    try {
      let processedIds = new Set();
      let nextPage = 1;

      // Load legacy call IDs if they exist
      if (fs.existsSync(this.legacyProcessedIdsFile)) {
        const legacyData = JSON.parse(fs.readFileSync(this.legacyProcessedIdsFile, 'utf8'));
        processedIds = new Set(legacyData.processedIds || []);
        nextPage = legacyData.nextPage || 1;
        console.log(`  Loaded ${processedIds.size} legacy call IDs from ${this.legacyProcessedIdsFile}`);
      }

      // Load current conversation IDs (overwrites page number)
      if (fs.existsSync(this.processedIdsFile)) {
        const data = JSON.parse(fs.readFileSync(this.processedIdsFile, 'utf8'));
        const newIds = new Set(data.processedIds || []);
        // Merge with legacy IDs
        newIds.forEach(id => processedIds.add(id));
        nextPage = data.nextPage || nextPage;
      }

      return { processedIds, nextPage };
    } catch (error) {
      console.log(`Warning: Could not load processed IDs: ${error.message}`);
    }
    return { processedIds: new Set(), nextPage: 1 };
  }

  /**
   * Save processed conversation IDs and pagination state to file
   */
  saveProcessedIds(processedIds, nextPage = null) {
    try {
      // Load existing data to preserve nextPage if not provided
      let currentNextPage = 1;
      if (fs.existsSync(this.processedIdsFile)) {
        const existingData = JSON.parse(fs.readFileSync(this.processedIdsFile, 'utf8'));
        currentNextPage = existingData.nextPage || 1;
      }

      const data = {
        lastUpdated: new Date().toISOString(),
        processedIds: Array.from(processedIds),
        nextPage: nextPage !== null ? nextPage : currentNextPage
      };
      fs.writeFileSync(this.processedIdsFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.log(`Warning: Could not save processed IDs: ${error.message}`);
    }
  }

  /**
   * Save mapping record to CSV file
   */
  saveMappingRecord(record) {
    try {
      const csvHeaders = 'ConversationID,Filename,PersonID,PersonCrmID,AccountID,AccountCrmID,MediaType,Platform,Date,Duration\n';
      const csvRow = `${record.conversationId},${record.filename},${record.personId || ''},${record.personCrmId || ''},${record.accountId || ''},${record.accountCrmId || ''},${record.mediaType || ''},${record.platform || ''},${record.date || ''},${record.duration || ''}\n`;

      // Create file with headers if it doesn't exist
      if (!fs.existsSync(this.mappingCsvFile)) {
        fs.writeFileSync(this.mappingCsvFile, csvHeaders, 'utf8');
        console.log(`  📊 Created mapping file: ${this.mappingCsvFile}`);
      }

      // Append the record
      fs.appendFileSync(this.mappingCsvFile, csvRow, 'utf8');
    } catch (error) {
      console.error(`  ⚠️  Failed to save mapping record: ${error.message}`);
    }
  }

  /**
   * Ensure download folder exists
   */
  ensureDownloadFolder() {
    if (!fs.existsSync(this.downloadFolder)) {
      fs.mkdirSync(this.downloadFolder, { recursive: true });
    }
  }

  /**
   * Write transcript content to file
   */
  writeTranscriptFile(fileName, content) {
    this.ensureDownloadFolder();
    const filePath = path.join(this.downloadFolder, fileName);
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }
}
