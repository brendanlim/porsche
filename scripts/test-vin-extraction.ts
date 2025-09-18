import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { BaTScraperPuppeteer } from '../lib/scrapers/bat-puppeteer';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testVinExtraction() {
  // Get a sample bring-a-trailer listing URL
  const { data: sampleListings } = await supabase
    .from('listings')
    .select('source_url, title')
    .eq('source', 'bring-a-trailer')
    .is('vin', null)
    .limit(3);

  if (!sampleListings || sampleListings.length === 0) {
    console.log('No bring-a-trailer listings without VIN found');
    return;
  }

  console.log('Testing VIN extraction on sample listings:\n');
  
  const scraper = new BaTScraperPuppeteer();
  
  for (const listing of sampleListings) {
    console.log(`\nTesting: ${listing.title}`);
    console.log(`URL: ${listing.source_url}`);
    
    try {
      // Parse the listing to extract VIN
      const result = await scraper.parseListing(listing.source_url);
      
      if (result?.vin) {
        console.log(`✅ VIN extracted: ${result.vin}`);
      } else {
        console.log(`❌ No VIN found`);
        console.log('Parsed data:', JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.error(`Error parsing listing: ${error}`);
    }
  }
  
  await scraper.close();
}

testVinExtraction().catch(console.error);