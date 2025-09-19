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

  if (source === 'bat') {
    // Use the simpler BAT scraper that can quickly get URLs from search pages
    const { BaTScraper } = await import('../../lib/scrapers/bat');
    const scraper = new BaTScraper();

    console.log('\n🔍 Collecting listing URLs from Bring a Trailer...\n');

    // Get search pages for all models and extract URLs
    const allUrls: Array<{url: string, title: string, model: string, trim: string}> = [];

    // Define the models to scrape (simplified list for quick collection)
    const modelsToCheck = [
      { model: '911', trim: 'GT3', url: 'https://bringatrailer.com/porsche/996-gt3/' },
      { model: '911', trim: 'GT3', url: 'https://bringatrailer.com/porsche/997-gt3/' },
      { model: '911', trim: 'GT3', url: 'https://bringatrailer.com/porsche/991-gt3/' },
      { model: '911', trim: 'GT3', url: 'https://bringatrailer.com/porsche/992-gt3/' },
      { model: '718 Cayman', trim: 'GT4', url: 'https://bringatrailer.com/porsche/cayman-gt4/' },
      { model: '911', trim: 'Turbo', url: 'https://bringatrailer.com/porsche/996-turbo/' },
      { model: '911', trim: 'Turbo', url: 'https://bringatrailer.com/porsche/997-turbo/' },
      { model: '911', trim: 'Turbo', url: 'https://bringatrailer.com/porsche/991-turbo/' },
      { model: '911', trim: 'Turbo', url: 'https://bringatrailer.com/porsche/992-turbo/' }
    ];

    for (const modelConfig of modelsToCheck) {
      try {
        console.log(`📄 Fetching ${modelConfig.model} ${modelConfig.trim}...`);

        // Fetch the search page HTML
        const response = await fetch(modelConfig.url);
        const html = await response.text();

        // Extract URLs from the HTML using cheerio
        const { default: cheerio } = await import('cheerio');
        const $ = cheerio.load(html);

        // Find all auction links
        $('.auctions-item-title a').each((_, elem) => {
          const href = $(elem).attr('href');
          const title = $(elem).text().trim();
          if (href && href.includes('bringatrailer.com/listing/')) {
            allUrls.push({
              url: href.startsWith('http') ? href : `https://bringatrailer.com${href}`,
              title,
              model: modelConfig.model,
              trim: modelConfig.trim
            });
          }
        });

        // Also check for data in script tags (BaT embeds JSON)
        $('script').each((_, elem) => {
          const scriptText = $(elem).html() || '';
          if (scriptText.includes('window.auctions')) {
            try {
              const match = scriptText.match(/window\.auctions\s*=\s*(\[[\s\S]*?\]);/);
              if (match) {
                const auctions = JSON.parse(match[1]);
                auctions.forEach((auction: any) => {
                  if (auction.url) {
                    allUrls.push({
                      url: auction.url,
                      title: auction.title || '',
                      model: modelConfig.model,
                      trim: modelConfig.trim
                    });
                  }
                });
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        });

      } catch (error) {
        console.error(`❌ Error fetching ${modelConfig.model} ${modelConfig.trim}:`, error);
      }
    }

    console.log(`\n✅ Found ${allUrls.length} listing URLs`);

    // Store URLs in queue table
    if (allUrls.length > 0) {
      console.log('\n📥 Saving URLs to queue...');

      // Remove duplicates
      const uniqueUrls = Array.from(new Map(allUrls.map(item => [item.url, item])).values());

      const queueItems = uniqueUrls.map(item => ({
        source: 'bring-a-trailer',
        url: item.url,
        title: item.title,
        model: item.model,
        trim: item.trim,
        status: 'pending',
        priority: 2, // Normal priority
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