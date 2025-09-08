import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BaTScraper } from '../lib/scrapers/bat';

async function testBaTExtraction() {
  const scraper = new BaTScraper();
  
  console.log('Testing BaT extraction for GT3...\n');
  
  const url = 'https://bringatrailer.com/listing/2022-porsche-911-gt3-31/';
  
  try {
    const result = await scraper.scrapeDetail(url, '911', 'GT3');
    
    if (result) {
      console.log('✅ Extraction Results:');
      console.log('====================');
      console.log(`VIN: ${result.vin || 'Not found'}`);
      console.log(`Mileage: ${result.mileage?.toLocaleString() || 'Not found'} miles`);
      console.log(`Exterior: ${result.exterior_color || 'Not found'}`);
      console.log(`Interior: ${result.interior_color || 'Not found'}`);
      console.log(`Transmission: ${result.transmission || 'Not found'}`);
      console.log(`Price: $${result.price?.toLocaleString()}`);
      console.log(`\nOptions (${result.options_text?.split(';').length || 0} items):`);
      
      if (result.options_text) {
        const options = result.options_text.split(';');
        options.forEach(opt => {
          console.log(`  • ${opt.trim()}`);
        });
      }
    } else {
      console.log('❌ Failed to extract details');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testBaTExtraction().catch(console.error);