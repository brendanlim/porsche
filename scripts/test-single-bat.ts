import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BaTScraper } from '../lib/scrapers/bat';

async function testSingleBaT() {
  const scraper = new BaTScraper();
  
  console.log('Testing single BaT listing save...\n');
  
  const url = 'https://bringatrailer.com/listing/2022-porsche-911-gt3-31/';
  
  try {
    // Just scrape and save one detail page
    const result = await scraper.scrapeDetail(url, '911', 'GT3');
    
    if (result) {
      console.log('✅ Scraped successfully');
      console.log(`Title: ${result.title}`);
      console.log(`VIN: ${result.vin}`);
      console.log(`Mileage: ${result.mileage}`);
      console.log(`Price: $${result.price?.toLocaleString()}`);
      
      // Try to save it
      const savedId = await (scraper as any).saveListing(result);
      if (savedId) {
        console.log(`\n✅ Successfully saved to database with ID: ${savedId}`);
      } else {
        console.log('\n❌ Failed to save to database');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testSingleBaT().catch(console.error);