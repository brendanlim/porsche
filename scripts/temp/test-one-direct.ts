#!/usr/bin/env npx tsx

import { BaTScraperPuppeteer } from '../../lib/scrapers/bat-puppeteer';

async function testOne() {
  console.log('🧪 Testing ONE BaT detail page...\n');

  const url = 'https://bringatrailer.com/listing/2023-porsche-911-gt3-touring-9/';
  const scraper = new BaTScraperPuppeteer();

  console.log(`🔗 Testing: ${url}`);

  try {
    const listing = await scraper.scrapeDetail(url);

    if (listing && listing.title !== 'Error' && listing.price > 0) {
      console.log('✅ SUCCESS! Scraped data:');
      console.log(`   Title: ${listing.title}`);
      console.log(`   Price: $${listing.price?.toLocaleString()}`);
      console.log(`   VIN: ${listing.vin || 'Not found'}`);
      console.log(`   Year: ${listing.year}`);
      console.log(`   Mileage: ${listing.mileage?.toLocaleString() || 'N/A'}`);
    } else {
      console.log('❌ Failed to scrape or got empty data');
      console.log('   Title:', listing?.title);
      console.log('   Price:', listing?.price);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testOne().catch(console.error);