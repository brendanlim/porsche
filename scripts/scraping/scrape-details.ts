#!/usr/bin/env npx tsx
/**
 * Stage 2: Detail Fetcher - Processes URLs from queue (can be run in parallel)
 * This script fetches detail pages for URLs in the queue
 * Can be run multiple times in parallel with different batch sizes
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { processListingOptions } from '../../lib/services/options-manager';

// Load environment
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const args = process.argv.slice(2);
  const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
  const priorityArg = args.find(arg => arg.startsWith('--priority='));

  const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 50;
  const priority = priorityArg ? parseInt(priorityArg.split('=')[1]) : undefined;

  console.log('\n' + '█'.repeat(70));
  console.log(' '.repeat(20) + 'STAGE 2: DETAIL FETCHER');
  console.log('█'.repeat(70));
  console.log('\n📋 Configuration:');
  console.log(`  • Batch size: ${batchSize} URLs`);
  if (priority) console.log(`  • Priority: ${priority}`);
  console.log(`  • Mode: Fetch detail pages and save to database`);
  console.log('─'.repeat(70));

  // Get pending URLs from queue
  let query = supabase
    .from('scrape_queue')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (priority) {
    query = query.eq('priority', priority);
  }

  const { data: queueItems, error: queueError } = await query;

  if (queueError) {
    console.error('❌ Error fetching queue:', queueError);
    return;
  }

  if (!queueItems || queueItems.length === 0) {
    console.log('\n✅ No pending URLs in queue. All done!');
    return;
  }

  console.log(`\n📥 Processing ${queueItems.length} URLs from queue...\n`);

  // Mark items as processing
  const queueIds = queueItems.map(item => item.id);
  await supabase
    .from('scrape_queue')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .in('id', queueIds);

  // Import scrapers
  const { BaTScraperPuppeteer } = await import('../../lib/scrapers/bat-puppeteer');
  const { BrightDataPuppeteer } = await import('../../lib/scrapers/bright-data-puppeteer');

  const puppeteerScraper = new BrightDataPuppeteer();
  const batScraper = new BaTScraperPuppeteer();

  let successCount = 0;
  let errorCount = 0;

  // Process each URL
  for (let i = 0; i < queueItems.length; i++) {
    const item = queueItems[i];
    const progress = `[${i + 1}/${queueItems.length}]`;

    try {
      console.log(`${progress} Processing: ${item.title || item.url}`);

      // Fetch the detail page
      const detailData = await puppeteerScraper.scrapeListingPage(item.url);

      if (detailData && detailData.html) {
        // Parse the listing
        const parsed = await batScraper.parseListing(detailData.html, item.url);

        if (parsed) {
          // Save to database
          const { data: savedListing, error: saveError } = await supabase
            .from('listings')
            .upsert({
              source: item.source,
              source_url: item.url,
              vin: parsed.vin,
              year: parsed.year,
              model: parsed.model || item.model,
              trim: parsed.trim || item.trim,
              generation: parsed.generation,
              price: parsed.price,
              mileage: parsed.mileage,
              exterior_color: parsed.exterior_color,
              interior_color: parsed.interior_color,
              location: parsed.location,
              title: parsed.title || item.title,
              options_text: parsed.options_text,
              sold_date: parsed.sold_date,
              scraped_at: new Date().toISOString()
            }, {
              onConflict: 'source_url',
              ignoreDuplicates: false
            })
            .select('id')
            .single();

          if (saveError) {
            throw saveError;
          }

          // Process options
          if (savedListing && parsed.options_text) {
            await processListingOptions(savedListing.id, parsed.options_text);
          }

          // Mark as completed in queue
          await supabase
            .from('scrape_queue')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              listing_id: savedListing?.id
            })
            .eq('id', item.id);

          successCount++;
          const finalModel = parsed.model || item.model;
          const finalTrim = parsed.trim || item.trim;
          console.log(`  ✅ Saved: ${finalModel} ${finalTrim} - $${parsed.price?.toLocaleString()}`);
        } else {
          throw new Error('Failed to parse listing');
        }
      } else {
        throw new Error('No HTML returned');
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error: any) {
      errorCount++;
      console.error(`  ❌ Error: ${error.message}`);

      // Mark as error in queue
      await supabase
        .from('scrape_queue')
        .update({
          status: 'error',
          error_message: error.message,
          error_at: new Date().toISOString()
        })
        .eq('id', item.id);
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 BATCH COMPLETE');
  console.log('─'.repeat(70));
  console.log(`  • Success: ${successCount}/${queueItems.length}`);
  console.log(`  • Errors: ${errorCount}/${queueItems.length}`);

  // Check remaining queue
  const { count: remaining } = await supabase
    .from('scrape_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (remaining && remaining > 0) {
    console.log(`\n📋 ${remaining} URLs still pending in queue`);
    console.log('💡 Run this script again to process more');
  } else {
    console.log('\n✅ All URLs processed!');
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});