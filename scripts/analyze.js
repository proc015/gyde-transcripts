#!/usr/bin/env node

/**
 * ANALYZE MODE
 *
 * Analyzes what conversations are available without processing them.
 * Shows breakdown by media type, platform, and transcript availability.
 *
 * Run with: node analyze.js
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const SALESLOFT_API_KEY = process.env.SALESLOFT_API_KEY;
const SALESLOFT_API_URL = 'https://api.salesloft.com/v2';

async function analyze() {
  try {
    console.log('╔═══════════════════════════════════════╗');
    console.log('║   🔍 CONVERSATION ANALYSIS MODE       ║');
    console.log('║   Analyzing available conversations   ║');
    console.log('╚═══════════════════════════════════════╝\n');

    console.log('Fetching first 100 conversations...\n');

    const response = await axios.get(`${SALESLOFT_API_URL}/conversations.json`, {
      headers: {
        'Authorization': `Bearer ${SALESLOFT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        per_page: 100,
        page: 1
      }
    });

    const conversations = response.data.data || [];

    if (conversations.length === 0) {
      console.log('❌ No conversations found.');
      return;
    }

    // Group by media type
    const byMediaType = {};
    const byPlatform = {};
    const withTranscripts = [];
    const byStatus = {};

    conversations.forEach(conv => {
      const mediaType = conv.media_type || 'unknown';
      const platform = conv.platform || 'unknown';
      const status = conv.status || 'unknown';

      byMediaType[mediaType] = (byMediaType[mediaType] || 0) + 1;
      byPlatform[platform] = (byPlatform[platform] || 0) + 1;
      byStatus[status] = (byStatus[status] || 0) + 1;

      if (conv.transcription && conv.transcription.id) {
        withTranscripts.push({
          id: conv.id,
          media_type: mediaType,
          platform: platform,
          duration: conv.duration || 'N/A',
          status: status,
          created_at: conv.created_at,
          has_transcript: true
        });
      }
    });

    console.log('=== OVERVIEW ===');
    console.log(`📊 Total conversations analyzed: ${conversations.length}`);
    console.log(`✅ With AI transcripts: ${withTranscripts.length}`);
    console.log(`❌ Without transcripts: ${conversations.length - withTranscripts.length}`);

    console.log('\n=== BY MEDIA TYPE ===');
    Object.entries(byMediaType)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        const withTranscript = withTranscripts.filter(c => c.media_type === type).length;
        console.log(`  ${type.padEnd(20)} ${count.toString().padStart(3)} total  (${withTranscript} with transcripts)`);
      });

    console.log('\n=== BY PLATFORM ===');
    Object.entries(byPlatform)
      .sort(([, a], [, b]) => b - a)
      .forEach(([platform, count]) => {
        const withTranscript = withTranscripts.filter(c => c.platform === platform).length;
        console.log(`  ${platform.padEnd(20)} ${count.toString().padStart(3)} total  (${withTranscript} with transcripts)`);
      });

    console.log('\n=== BY STATUS ===');
    Object.entries(byStatus)
      .sort(([, a], [, b]) => b - a)
      .forEach(([status, count]) => {
        console.log(`  ${status.padEnd(20)} ${count.toString().padStart(3)}`);
      });

    if (withTranscripts.length > 0) {
      console.log('\n=== SAMPLE CONVERSATIONS WITH TRANSCRIPTS ===');
      withTranscripts.slice(0, 10).forEach((c, idx) => {
        const mediaType = c.media_type.padEnd(15);
        const platform = c.platform.padEnd(15);
        const duration = String(c.duration).padStart(4);
        console.log(`  ${idx + 1}. ${mediaType} ${platform} ${duration}s  ${c.created_at}`);
      });

      if (withTranscripts.length > 10) {
        console.log(`  ... and ${withTranscripts.length - 10} more`);
      }
    }

    console.log('\n=== RECOMMENDATIONS ===');
    if (withTranscripts.length === 0) {
      console.log('  ⚠️  No conversations with transcripts found in first 100.');
      console.log('  💡 Try running the main script to scan more pages.');
    } else {
      console.log(`  ✅ Found ${withTranscripts.length} conversations ready to process!`);
      console.log('  💡 Run "npm test" to process a few in test mode.');
      console.log('  💡 Run "npm run batch" to process all available transcripts.');
    }

    // Check for different media types
    const mediaTypes = Object.keys(byMediaType);
    if (mediaTypes.length > 1) {
      console.log(`\n  🎉 Great! You have ${mediaTypes.length} different conversation types:`);
      mediaTypes.forEach(type => {
        console.log(`     - ${type}`);
      });
    } else if (mediaTypes.length === 1) {
      console.log(`\n  ℹ️  Only found "${mediaTypes[0]}" conversations in this sample.`);
      console.log('     Other types might exist in later pages.');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error analyzing conversations:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

analyze();
