#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { CarsAndBidsBrightDataScraper } from '../../lib/scrapers/carsandbids-brightdata';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testCarsAndBidsBrightData() {
  console.log('Testing Cars and Bids scraper with Bright Data\n');
  console.log('='.repeat(60));

  // Check Bright Data credentials
  if (!process.env.BRIGHT_DATA_CUSTOMER_ID || !process.env.BRIGHT_DATA_PASSWORD) {
    console.error('❌ Bright Data credentials not configured!');
    console.error('Please set BRIGHT_DATA_CUSTOMER_ID and BRIGHT_DATA_PASSWORD in .env.local');
    return;
  }

  console.log('✅ Bright Data credentials found');
  console.log(`Customer ID: ${process.env.BRIGHT_DATA_CUSTOMER_ID}`);
  console.log(`Zone: ${process.env.BRIGHT_DATA_BROWSER_ZONE || 'scraping_browser'}\n`);

  const scraper = new CarsAndBidsBrightDataScraper();

  try {
    // Test 1: Search for GT4 listings
    console.log('Test 1: Searching for GT4 listings...');
    console.log('-'.repeat(40));

    const gt4Listings = await scraper.scrapeListings({
      model: 'GT4',
      maxPages: 1,
      onlySold: true
    });

    console.log(`\nFound ${gt4Listings.length} GT4 listings\n`);

    // Display first few results
    gt4Listings.slice(0, 3).forEach((listing, i) => {
      console.log(`${i + 1}. ${listing.title}`);
      console.log(`   Price: $${listing.price?.toLocaleString() || 'N/A'}`);
      console.log(`   VIN: ${listing.vin || 'N/A'}`);
      console.log(`   Mileage: ${listing.mileage?.toLocaleString() || 'N/A'} miles`);
      console.log(`   Status: ${listing.status}`);
      console.log(`   URL: ${listing.url}`);
      console.log(`   Location: ${listing.location?.city || 'N/A'}, ${listing.location?.state || 'N/A'}`);
      console.log(`   Images: ${listing.images?.length || 0} found`);
      console.log();
    });

    // Test 2: General Porsche search
    console.log('Test 2: General Porsche search...');
    console.log('-'.repeat(40));

    const porscheListings = await scraper.scrapeListings({
      maxPages: 1,
      onlySold: false
    });

    console.log(`\nFound ${porscheListings.length} Porsche listings\n`);

    // Group by model
    const modelCounts = new Map<string, number>();
    porscheListings.forEach(listing => {
      const model = listing.model || 'Unknown';
      modelCounts.set(model, (modelCounts.get(model) || 0) + 1);
    });

    console.log('Models found:');
    Array.from(modelCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([model, count]) => {
        console.log(`  - ${model}: ${count}`);
      });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Cars and Bids Bright Data scraper test completed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
  }
}

// Run the test
testCarsAndBidsBrightData().catch(console.error);