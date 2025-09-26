#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testCarsAndBidsScraper() {
  console.log('🧪 Testing Cars & Bids ScrapingBee Scraper');
  console.log('API Key loaded:', process.env.SCRAPINGBEE_API_KEY ? 'Yes' : 'No');
  console.log('═'.repeat(60));

  try {
    const { CarsAndBidsScraperSB } = await import('../../lib/scrapers/carsandbids-sb');
    const scraper = new CarsAndBidsScraperSB();

    // Test 1: Current auctions (active)
    console.log('\n📋 Test 1: Current auctions for Porsche 911');
    const activeListings = await scraper.scrapeListings({
      model: '911',
      onlySold: false,
      maxPages: 1
    });

    console.log(`✅ Found ${activeListings.length} active listings`);
    if (activeListings.length > 0) {
      console.log('\nFirst 3 active listings:');
      activeListings.slice(0, 3).forEach((listing, i) => {
        console.log(`\n${i + 1}. ${listing.title}`);
        console.log(`   Price: $${listing.price?.toLocaleString()}`);
        console.log(`   Year: ${listing.year || 'N/A'}`);
        console.log(`   Model: ${listing.model || 'N/A'}`);
        console.log(`   Trim: ${listing.trim || 'N/A'}`);
        console.log(`   Status: ${listing.status}`);
        console.log(`   URL: ${listing.url}`);
      });
    }

    // Test 2: Past auctions (sold)
    console.log('\n' + '─'.repeat(60));
    console.log('\n📋 Test 2: Past auctions (sold) for all Porsche');
    const soldListings = await scraper.scrapeListings({
      onlySold: true,
      maxPages: 1
    });

    console.log(`✅ Found ${soldListings.length} sold listings`);
    if (soldListings.length > 0) {
      console.log('\nFirst 3 sold listings:');
      soldListings.slice(0, 3).forEach((listing, i) => {
        console.log(`\n${i + 1}. ${listing.title}`);
        console.log(`   Price: $${listing.price?.toLocaleString()}`);
        console.log(`   Year: ${listing.year || 'N/A'}`);
        console.log(`   Model: ${listing.model || 'N/A'}`);
        console.log(`   Trim: ${listing.trim || 'N/A'}`);
        console.log(`   Status: ${listing.status}`);
        console.log(`   VIN: ${listing.vin || 'N/A'}`);
        console.log(`   Mileage: ${listing.mileage ? listing.mileage.toLocaleString() : 'N/A'}`);
        console.log(`   Sold Date: ${listing.sold_date || 'N/A'}`);
        console.log(`   Location: ${listing.location || 'N/A'}`);
      });
    }

    // Test 3: Specific GT model search
    console.log('\n' + '─'.repeat(60));
    console.log('\n📋 Test 3: Searching for GT3 models');
    const gt3Listings = await scraper.scrapeListings({
      model: '911',
      trim: 'GT3',
      onlySold: true,
      maxPages: 1
    });

    console.log(`✅ Found ${gt3Listings.length} GT3 listings`);
    const actualGT3s = gt3Listings.filter(l => l.trim?.includes('GT3'));
    console.log(`   - ${actualGT3s.length} actually have GT3 in trim`);

    if (actualGT3s.length > 0) {
      console.log('\nSample GT3:');
      const sample = actualGT3s[0];
      console.log(`   ${sample.title}`);
      console.log(`   Price: $${sample.price?.toLocaleString()}`);
      console.log(`   Trim: ${sample.trim}`);
    }

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 Test Summary:');
    console.log(`   Active listings: ${activeListings.length}`);
    console.log(`   Sold listings: ${soldListings.length}`);
    console.log(`   GT3 listings: ${actualGT3s.length}`);
    console.log(`   Total: ${activeListings.length + soldListings.length}`);

    // Check data quality
    const hasVIN = soldListings.filter(l => l.vin).length;
    const hasMileage = soldListings.filter(l => l.mileage).length;
    const hasDate = soldListings.filter(l => l.sold_date).length;

    console.log('\n📊 Data Quality (from sold listings):');
    console.log(`   With VIN: ${hasVIN}/${soldListings.length} (${Math.round(hasVIN/soldListings.length * 100)}%)`);
    console.log(`   With Mileage: ${hasMileage}/${soldListings.length} (${Math.round(hasMileage/soldListings.length * 100)}%)`);
    console.log(`   With Date: ${hasDate}/${soldListings.length} (${Math.round(hasDate/soldListings.length * 100)}%)`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  }
}

testCarsAndBidsScraper().catch(console.error);