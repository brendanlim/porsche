#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testScrapingBeeScrapers() {
  console.log('🧪 Testing ScrapingBee Scrapers');
  console.log('═'.repeat(60));

  const scrapers = [
    { name: 'BaT', module: '../../lib/scrapers/bat-sb', class: 'BaTScraperSB', model: '911', trim: 'gt3' },
    { name: 'Classic.com', module: '../../lib/scrapers/classic-sb', class: 'ClassicScraperSB', model: '911' },
    { name: 'Cars & Bids', module: '../../lib/scrapers/carsandbids-sb', class: 'CarsAndBidsScraperSB', model: '911' },
    { name: 'Cars.com', module: '../../lib/scrapers/inventory-sb', class: 'CarsScraperSB', model: '911' },
    { name: 'Edmunds', module: '../../lib/scrapers/inventory-sb', class: 'EdmundsScraperSB', model: '911' },
    { name: 'AutoTrader', module: '../../lib/scrapers/inventory-sb', class: 'AutoTraderScraperSB', model: '911' }
  ];

  const results: any = {};

  for (const scraperConfig of scrapers) {
    console.log(`\n📋 Testing ${scraperConfig.name}...`);

    try {
      const module = await import(scraperConfig.module);
      const ScraperClass = module[scraperConfig.class];

      if (!ScraperClass) {
        console.error(`  ❌ Class ${scraperConfig.class} not found in module`);
        results[scraperConfig.name] = 'Class not found';
        continue;
      }

      const scraper = new ScraperClass();
      console.log(`  ✅ Scraper initialized`);

      // Test with minimal pages for speed
      const listings = await scraper.scrapeListings({
        model: scraperConfig.model,
        trim: scraperConfig.trim,
        maxPages: 1
      });

      console.log(`  ✅ Found ${listings.length} listings`);

      // Show sample listing
      if (listings.length > 0) {
        const sample = listings[0];
        console.log(`  📊 Sample listing:`);
        console.log(`     Title: ${sample.title || 'N/A'}`);
        console.log(`     Price: $${sample.price?.toLocaleString() || 'N/A'}`);
        console.log(`     URL: ${sample.url || 'N/A'}`);
      }

      results[scraperConfig.name] = `Success (${listings.length} listings)`;

    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
      results[scraperConfig.name] = `Error: ${error.message}`;
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 Test Results Summary:');
  console.log('═'.repeat(60));

  for (const [scraper, result] of Object.entries(results)) {
    const icon = result.toString().includes('Success') ? '✅' : '❌';
    console.log(`${icon} ${scraper}: ${result}`);
  }
}

// Run tests
testScrapingBeeScrapers().catch(console.error);