#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Set up database connection before importing scrapers
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

import { CarsAndBidsPuppeteerScraper } from '../../lib/scrapers/carsandbids-puppeteer';

async function testCarsAndBidsPuppeteer() {
  console.log('Testing Cars and Bids Puppeteer Scraper\n');
  console.log('='.repeat(60));

  const scraper = new CarsAndBidsPuppeteerScraper();

  try {
    console.log('Test 1: Scraping Cars and Bids for 911 GT3...\n');

    const gt3Listings = await scraper.scrapeListings({
      model: 'GT3',
      maxPages: 1,
      onlySold: true
    });

    console.log(`\nResults: Found ${gt3Listings.length} GT3 listings\n`);

    if (gt3Listings.length === 0) {
      console.log('No GT3 listings found, trying general Porsche search...\n');

      const generalListings = await scraper.scrapeListings({
        maxPages: 1,
        onlySold: false
      });

      console.log(`Found ${generalListings.length} general Porsche listings`);

      if (generalListings.length > 0) {
        console.log('\n✅ Puppeteer scraper is working!\n');

        // Show first few listings
        generalListings.slice(0, 3).forEach((listing, i) => {
          console.log(`${i + 1}. ${listing.title}`);
          console.log(`   URL: ${listing.url}`);
          console.log(`   Price: $${listing.price?.toLocaleString() || 'N/A'}`);
          console.log(`   Status: ${listing.status}`);
          console.log();
        });
      } else {
        console.log('❌ No listings found - Puppeteer scraper may need debugging');
      }
    } else {
      console.log('✅ Puppeteer scraper is working with GT3 search!\n');

      // Display GT3 listings
      gt3Listings.slice(0, 5).forEach((listing, i) => {
        console.log(`${i + 1}. ${listing.title}`);
        console.log(`   URL: ${listing.url}`);
        console.log(`   Price: $${listing.price?.toLocaleString() || 'N/A'}`);
        console.log(`   VIN: ${listing.vin || 'N/A'}`);
        console.log(`   Mileage: ${listing.mileage?.toLocaleString() || 'N/A'} miles`);
        console.log(`   Location: ${listing.location?.city || 'N/A'}, ${listing.location?.state || 'N/A'}`);
        console.log(`   Status: ${listing.status}`);
        console.log(`   Year: ${listing.year || 'N/A'}`);
        console.log(`   Model: ${listing.model}`);
        console.log(`   Trim: ${listing.trim}`);
        console.log(`   Sold Date: ${listing.sold_date || 'N/A'}`);
        console.log();
      });

      // Data quality check
      console.log('Data Quality Check:');
      const hasPrice = gt3Listings.filter(l => l.price && l.price > 0).length;
      const hasVIN = gt3Listings.filter(l => l.vin).length;
      const hasMileage = gt3Listings.filter(l => l.mileage).length;
      const hasLocation = gt3Listings.filter(l => l.location).length;
      const hasSoldDate = gt3Listings.filter(l => l.sold_date).length;

      console.log(`  Listings with price: ${hasPrice}/${gt3Listings.length}`);
      console.log(`  Listings with VIN: ${hasVIN}/${gt3Listings.length}`);
      console.log(`  Listings with mileage: ${hasMileage}/${gt3Listings.length}`);
      console.log(`  Listings with location: ${hasLocation}/${gt3Listings.length}`);
      console.log(`  Listings with sold date: ${hasSoldDate}/${gt3Listings.length}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
  }

  // Make sure to exit
  process.exit(0);
}

// Run test
testCarsAndBidsPuppeteer().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});