#!/usr/bin/env npx tsx
/**
 * Stage 1: Index Scraper - Collects URLs only (fast, ~5-10 minutes)
 * This script only fetches search/listing pages and extracts URLs
 * Does NOT fetch individual detail pages
 */

import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load environment - conditional dotenv for local development
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  try {
    const dotenv = require('dotenv');
    dotenv.config({ path: envPath });
    console.log('Loaded environment variables from .env.local');
  } catch (error) {
    console.log('dotenv not available, using environment variables from system');
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Create a queue table if it doesn't exist
async function ensureQueueTable() {
  // This would be a migration, but for now we'll just document the structure
  console.log('📋 Using scrape_queue table for URL management');
}

async function main() {
  const args = process.argv.slice(2);
  const sourceArg = args.find(arg => arg.startsWith('--source='));
  const testModeArg = args.find(arg => arg.startsWith('--test'));
  const modelArg = args.find(arg => arg.startsWith('--model='));
  const trimArg = args.find(arg => arg.startsWith('--trim='));

  const source = sourceArg ? sourceArg.split('=')[1].toLowerCase() : 'bat';
  const testMode = !!testModeArg;
  const testModel = modelArg ? modelArg.split('=')[1] : undefined;
  const testTrim = trimArg ? trimArg.split('=')[1] : undefined;

  console.log('\n' + '█'.repeat(70));
  console.log(' '.repeat(20) + 'STAGE 1: INDEX SCRAPER');
  console.log('█'.repeat(70));
  console.log('\n📋 Configuration:');
  console.log(`  • Source: ${source}`);
  console.log(`  • Mode: Index URLs only (no detail fetching)`);
  if (testMode) {
    console.log(`  • TEST MODE: Limited scraping`);
    if (testModel) console.log(`  • Test Model: ${testModel}`);
    if (testTrim) console.log(`  • Test Trim: ${testTrim}`);
  }
  console.log(`  • Estimated time: ${testMode ? '1-2' : '5-10'} minutes`);
  console.log('─'.repeat(70));

  if (source === 'bat') {
    // Import the BaTScraperPuppeteer that works
    const { BaTScraperPuppeteer } = await import('../../lib/scrapers/bat-puppeteer');
    const scraper = new BaTScraperPuppeteer();

    console.log('\n🔍 Collecting listing URLs from Bring a Trailer...\n');

    // Run the scraper with indexOnly mode - just collect URLs, don't fetch details
    const scraperOptions: any = {
      maxPages: 1,  // Just get first page of each model for speed
      onlySold: true,
      indexOnly: true  // This flag will skip detail page fetching
    };

    // In test mode, only scrape specific model/trim
    if (testMode && (testModel || testTrim)) {
      if (testModel) scraperOptions.model = testModel;
      if (testTrim) scraperOptions.trim = testTrim;
    }

    const listings = await scraper.scrapeListings(scraperOptions);

    console.log(`\n✅ Found ${listings.length} listing URLs`);

    // Store URLs in queue table
    if (listings.length > 0) {
      console.log('\n📥 Saving URLs to queue...');

      const queueItems = listings.map(listing => ({
        source: 'bring-a-trailer',
        url: listing.source_url || '',
        title: listing.title || '',
        model: listing.model || '',
        trim: listing.trim || '',
        status: 'pending',
        priority: 2, // Normal priority (can be adjusted based on value later)
        created_at: new Date().toISOString()
      }));

      // Filter out any items without URLs
      const validQueueItems = queueItems.filter(item => item.url);

      if (validQueueItems.length > 0) {
        // Insert into queue (upsert to avoid duplicates)
        const { error } = await supabase
          .from('scrape_queue')
          .upsert(validQueueItems, {
            onConflict: 'url',
            ignoreDuplicates: true
          });

        if (error) {
          console.error('❌ Error saving to queue:', error);
          console.error('Error details:', error);
        } else {
          console.log(`✅ Saved ${validQueueItems.length} URLs to processing queue`);

          // Show queue stats
          const { count: pendingCount } = await supabase
            .from('scrape_queue')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

          console.log(`\n📊 Queue Status:`);
          console.log(`  • Pending: ${pendingCount || 0} URLs`);
        }
      } else {
        console.log('❌ No valid URLs to save');
      }
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('✅ INDEX SCRAPING COMPLETE');
  console.log('═'.repeat(70));
  console.log('\n💡 Next step: Run scrape-details.ts to process the queue');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});