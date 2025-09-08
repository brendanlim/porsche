import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BaTScraper } from '../lib/scrapers/bat';

async function testMidnightBlue() {
  const scraper = new BaTScraper();
  
  console.log('Testing Midnight Blue Metallic extraction...\n');
  
  const url = 'https://bringatrailer.com/listing/1996-porsche-911-carrera-coupe-88/';
  
  try {
    const result = await scraper.scrapeDetail(url, '911', 'Carrera');
    
    if (result) {
      console.log('✅ Extraction Results:');
      console.log('====================');
      console.log(`Title: ${result.title}`);
      console.log(`VIN: ${result.vin || 'Not found'}`);
      console.log(`Exterior Color: ${result.exterior_color || 'Not found'}`);
      console.log(`Interior Color: ${result.interior_color || 'Not found'}`);
      console.log(`Transmission: ${result.transmission || 'Not found'}`);
      console.log(`Mileage: ${result.mileage?.toLocaleString() || 'Not found'} miles`);
      console.log(`\nFirst few options:`);
      if (result.options_text) {
        const options = result.options_text.split(';').slice(0, 5);
        options.forEach(opt => console.log(`  • ${opt.trim()}`));
      }
    } else {
      console.log('❌ Failed to extract details');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testMidnightBlue().catch(console.error);