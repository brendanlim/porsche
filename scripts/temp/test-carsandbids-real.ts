#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Set up database connection before importing scrapers
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

import { CarsAndBidsScraper } from '../../lib/scrapers/carsandbids';

async function testCarsAndBidsScraper() {
  console.log('Testing Cars and Bids Scraper\n');
  console.log('='.repeat(60));

  const scraper = new CarsAndBidsScraper();

  try {
    console.log('Scraping Cars and Bids for 911 GT3...\n');

    const listings = await scraper.scrapeListings({
      model: '911 GT3',
      maxPages: 1,
      onlySold: true
    });

    console.log(`\nResults: Found ${listings.length} listings\n`);

    if (listings.length === 0) {
      console.log('❌ No listings found - scraper may not be working properly');

      // Try without model filter
      console.log('\nTrying general Porsche search...\n');
      const generalListings = await scraper.scrapeListings({
        maxPages: 1,
        onlySold: false
      });

      console.log(`Found ${generalListings.length} Porsche listings`);

      if (generalListings.length === 0) {
        console.log('❌ Still no listings - scraper needs fixing');
      } else {
        console.log('✓ General search works, but GT3 filter may be too restrictive');

        // Show first listing
        if (generalListings[0]) {
          console.log('\nFirst listing:');
          console.log(`  Title: ${generalListings[0].title}`);
          console.log(`  URL: ${generalListings[0].url}`);
          console.log(`  Price: $${generalListings[0].price?.toLocaleString() || 'N/A'}`);
          console.log(`  Status: ${generalListings[0].status}`);
        }
      }
    } else {
      console.log('✅ Scraper is working!\n');

      // Display first few listings
      listings.slice(0, 3).forEach((listing, i) => {
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
        console.log();
      });

      // Check data quality
      console.log('Data Quality Check:');
      const hasPrice = listings.filter(l => l.price && l.price > 0).length;
      const hasVIN = listings.filter(l => l.vin).length;
      const hasMileage = listings.filter(l => l.mileage).length;
      const hasLocation = listings.filter(l => l.location).length;

      console.log(`  Listings with price: ${hasPrice}/${listings.length}`);
      console.log(`  Listings with VIN: ${hasVIN}/${listings.length}`);
      console.log(`  Listings with mileage: ${hasMileage}/${listings.length}`);
      console.log(`  Listings with location: ${hasLocation}/${listings.length}`);
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
testCarsAndBidsScraper().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});