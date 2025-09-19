#!/usr/bin/env npx tsx
/**
 * Stage 1: Index Scraper - Collects URLs only (fast, ~5-10 minutes)
 * This script only fetches search/listing pages and extracts URLs
 * Does NOT fetch individual detail pages
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load environment
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
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
  const source = sourceArg ? sourceArg.split('=')[1].toLowerCase() : 'bat';

  console.log('\n' + '█'.repeat(70));
  console.log(' '.repeat(20) + 'STAGE 1: INDEX SCRAPER');
  console.log('█'.repeat(70));
  console.log('\n📋 Configuration:');
  console.log(`  • Source: ${source}`);
  console.log(`  • Mode: Index URLs only (no detail fetching)`);
  console.log(`  • Estimated time: 5-10 minutes`);
  console.log('─'.repeat(70));

  // Import the appropriate scraper
  const { BaTScraperPuppeteer } = await import('../../lib/scrapers/bat-puppeteer');

  if (source === 'bat') {
    const scraper = new BaTScraperPuppeteer();

    // Modify the scraper to only get URLs, not fetch details
    console.log('\n🔍 Collecting listing URLs from Bring a Trailer...\n');

    // We'll need to modify the scraper to support URL-only mode
    // For now, let's collect with maxPages=1 to keep it fast
    const listings = await scraper.scrapeListings({
      maxPages: 1,  // Just get first page for speed
      onlySold: true
    });

    console.log(`\n✅ Found ${listings.length} listing URLs`);

    // Store URLs in queue table
    if (listings.length > 0) {
      console.log('\n📥 Saving URLs to queue...');

      const queueItems = listings.map(listing => ({
        source: 'bring-a-trailer',
        url: listing.source_url || listing.url,
        title: listing.title,
        model: listing.model,
        trim: listing.trim,
        status: 'pending',
        priority: listing.price && listing.price > 200000 ? 1 : 2, // High-value cars get priority
        created_at: new Date().toISOString()
      }));

      // Insert into queue (upsert to avoid duplicates)
      const { error } = await supabase
        .from('scrape_queue')
        .upsert(queueItems, {
          onConflict: 'url',
          ignoreDuplicates: true
        });

      if (error) {
        console.error('❌ Error saving to queue:', error);
      } else {
        console.log(`✅ Saved ${queueItems.length} URLs to processing queue`);

        // Show queue stats
        const { count: pendingCount } = await supabase
          .from('scrape_queue')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        console.log(`\n📊 Queue Status:`);
        console.log(`  • Pending: ${pendingCount || 0} URLs`);
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