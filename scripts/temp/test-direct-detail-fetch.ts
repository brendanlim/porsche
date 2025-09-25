#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import { BaTScraperPuppeteer } from '../../lib/scrapers/bat-puppeteer';

async function testDirectDetailFetch() {
  console.log('🧪 Testing direct BaT detail page fetching...\n');

  // Test URLs - known BaT sold listings
  const testUrls = [
    'https://bringatrailer.com/listing/2023-porsche-911-gt3-touring-9/',
    'https://bringatrailer.com/listing/2024-porsche-911-gt3-rs-7/',
    'https://bringatrailer.com/listing/2022-porsche-718-cayman-gt4-rs-13/'
  ];

  const scraper = new BaTScraperPuppeteer();

  for (const url of testUrls) {
    console.log(`\n🔗 Testing: ${url}`);

    try {
      console.log('🌐 Fetching detail page directly...');
      const listing = await scraper.scrapeDetail(url);

      if (listing) {
        console.log('✅ Successfully scraped listing:');
        console.log(`   Title: ${listing.title}`);
        console.log(`   Price: $${listing.price?.toLocaleString()}`);
        console.log(`   VIN: ${listing.vin || 'Not found'}`);
        console.log(`   Year: ${listing.year}`);
        console.log(`   Mileage: ${listing.mileage?.toLocaleString() || 'N/A'}`);
        console.log(`   Status: ${listing.status}`);

        // Test database save
        console.log('💾 Testing database save...');

        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { error } = await supabase
          .from('listings')
          .upsert({
            source: 'bring-a-trailer',
            source_url: listing.source_url,
            title: listing.title,
            price: listing.price,
            year: listing.year,
            model: listing.model || '911',
            trim: listing.trim,
            mileage: listing.mileage,
            status: listing.status,
            vin: listing.vin,
            exterior_color: listing.exterior_color,
            interior_color: listing.interior_color,
            transmission: listing.transmission,
            options_text: listing.options_text,
            location: listing.location,
            sold_date: listing.sold_date,
            scraped_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          }, {
            onConflict: 'source_url',
            ignoreDuplicates: false
          });

        if (error) {
          console.error(`❌ Database save failed: ${error.message}`);
        } else {
          console.log('✅ Successfully saved to database!');
        }

      } else {
        console.log('❌ No listing data returned');
      }
    } catch (error) {
      console.error(`❌ Error scraping ${url}:`, error);
    }

    console.log('─'.repeat(60));
  }
}

testDirectDetailFetch().catch(console.error);