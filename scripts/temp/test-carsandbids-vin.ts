#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv';
import path from 'path';
import { decodePorscheVIN } from '../../lib/utils/porsche-vin-decoder';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testCarsAndBidsWithVIN() {
  console.log('🧪 Testing Cars & Bids with VIN Decoder');
  console.log('═'.repeat(60));

  try {
    const { CarsAndBidsScraperSB } = await import('../../lib/scrapers/carsandbids-sb');
    const scraper = new CarsAndBidsScraperSB();

    // Test with GT3 models
    console.log('\n📋 Testing with GT3 models...');
    const currentListings = await scraper.scrapeListings({
      model: 'GT3',
      onlySold: true,
      maxPages: 1
    });

    console.log(`\n✅ Found ${currentListings.length} current listings`);

    // Check VIN decoding results
    const soldListings = currentListings;
    const withVIN = soldListings.filter(l => l.vin);
    console.log(`📊 Listings with VIN: ${withVIN.length}/${soldListings.length}`);

    if (withVIN.length > 0) {
      console.log('\n📊 VIN Decoding Results:');
      withVIN.slice(0, 5).forEach((listing, i) => {
        console.log(`\n${i + 1}. ${listing.title}`);
        console.log(`   VIN: ${listing.vin}`);
        console.log(`   Decoded Model: ${listing.model || 'N/A'}`);
        console.log(`   Decoded Trim: ${listing.trim || 'N/A'}`);
        console.log(`   Decoded Generation: ${listing.generation || 'N/A'}`);
        console.log(`   Year: ${listing.year || 'N/A'}`);

        // Test VIN decoder directly to see what it returns
        if (listing.vin) {
          const decoded = decodePorscheVIN(listing.vin);
          console.log(`   Direct decode: ${decoded.model} ${decoded.engineType} (${decoded.generation}) - ${decoded.confidence}`);
        }
      });
    }

    // Summary of data quality
    const hasModel = soldListings.filter(l => l.model).length;
    const hasTrim = soldListings.filter(l => l.trim).length;
    const hasGeneration = soldListings.filter(l => l.generation).length;

    console.log('\n📊 Data Quality Summary:');
    console.log(`   With VIN: ${withVIN.length}/${soldListings.length} (${Math.round(withVIN.length/soldListings.length * 100)}%)`);
    console.log(`   With Model: ${hasModel}/${soldListings.length} (${Math.round(hasModel/soldListings.length * 100)}%)`);
    console.log(`   With Trim: ${hasTrim}/${soldListings.length} (${Math.round(hasTrim/soldListings.length * 100)}%)`);
    console.log(`   With Generation: ${hasGeneration}/${soldListings.length} (${Math.round(hasGeneration/soldListings.length * 100)}%)`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  }
}

testCarsAndBidsWithVIN().catch(console.error);