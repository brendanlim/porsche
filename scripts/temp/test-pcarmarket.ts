#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { PCarMarketScraper } from '../../lib/scrapers/pcarmarket';
import { supabaseAdmin } from '@/lib/supabase/admin';

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log(' '.repeat(25) + 'PCARMARKET SCRAPER TEST');
  console.log('='.repeat(80));

  const scraper = new PCarMarketScraper();

  try {
    // Test with just 991 generation (one URL) and 1 page to start
    console.log('\n🧪 Testing PcarMarket scraper with 991 generation...');
    console.log('   Credentials: ' + (process.env.PCARMARKET_EMAIL ? '✅' : '❌'));
    console.log('   Password: ' + (process.env.PCARMARKET_PASSWORD ? '✅' : '❌'));

    const listings = await scraper.scrapeListings({
      model: '991',  // Just test 991
      maxPages: 1    // Just 1 page for testing
    });

    console.log(`\n✅ Successfully scraped ${listings.length} listings`);

    if (listings.length > 0) {
      console.log('\n📊 Sample listings:');
      listings.slice(0, 3).forEach((listing, idx) => {
        console.log(`\n   [${idx + 1}] ${listing.title || 'No title'}`);
        console.log(`       URL: ${listing.source_url}`);
        console.log(`       Price: ${listing.price ? `$${listing.price.toLocaleString()}` : 'N/A'}`);
        console.log(`       Year: ${listing.year || 'N/A'}`);
        console.log(`       Mileage: ${listing.mileage ? `${listing.mileage.toLocaleString()} mi` : 'N/A'}`);
        console.log(`       VIN: ${listing.vin || 'N/A'}`);
      });
    }

    // Check how many we could save
    const validListings = listings.filter(l => l.vin && l.price && l.price > 0);
    console.log(`\n📈 ${validListings.length}/${listings.length} listings have VIN and price`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Test complete!');
  console.log('='.repeat(80));
}

main().catch(console.error);