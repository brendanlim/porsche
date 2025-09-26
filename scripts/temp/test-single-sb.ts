#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testSingleScraper() {
  console.log('🧪 Testing Single ScrapingBee Scraper');
  console.log('API Key loaded:', process.env.SCRAPINGBEE_API_KEY ? 'Yes' : 'No');
  console.log('═'.repeat(60));

  try {
    // Test Classic.com first (simpler, no JS required)
    console.log('\n📋 Testing Classic.com scraper...');
    const { ClassicScraperSB } = await import('../../lib/scrapers/classic-sb');
    const scraper = new ClassicScraperSB();

    const listings = await scraper.scrapeListings({
      model: '911',
      maxPages: 1
    });

    console.log(`✅ Found ${listings.length} listings`);

    if (listings.length > 0) {
      console.log('\n📊 First 3 listings:');
      listings.slice(0, 3).forEach((listing, i) => {
        console.log(`\n${i + 1}. ${listing.title}`);
        console.log(`   Price: $${listing.price?.toLocaleString()}`);
        console.log(`   URL: ${listing.url}`);
        console.log(`   Status: ${listing.status}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  }
}

testSingleScraper().catch(console.error);