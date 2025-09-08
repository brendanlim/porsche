import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BaTScraper } from '../lib/scrapers/bat';

async function testBaTDetail() {
  const scraper = new BaTScraper();
  
  console.log('Testing BaT detail page extraction...\n');
  
  // Test a known sold listing
  const testUrls = [
    'https://bringatrailer.com/listing/2022-porsche-911-gt3-31/',
    'https://bringatrailer.com/listing/1996-porsche-911-carrera-coupe-88/',
    'https://bringatrailer.com/listing/2007-porsche-911-carrera-s-coupe-73/'
  ];
  
  for (const url of testUrls) {
    console.log(`\n============================================`);
    console.log(`Testing: ${url}`);
    console.log(`============================================\n`);
    
    try {
      const result = await scraper.scrapeDetail(url, '911', 'GT3');
      
      if (result) {
        console.log('✅ Successfully extracted detail:');
        console.log(`  Title: ${result.title}`);
        console.log(`  Price: $${result.price?.toLocaleString()}`);
        console.log(`  Mileage: ${result.mileage?.toLocaleString() || 'Not found'} miles`);
        console.log(`  Year: ${result.year}`);
        console.log(`  Model: ${result.model}`);
        console.log(`  Trim: ${result.trim}`);
        console.log(`  Generation: ${result.generation}`);
        console.log(`  VIN: ${result.vin || 'Not found'}`);
        console.log(`  Exterior Color: ${result.exterior_color || 'Not found'}`);
        console.log(`  Interior Color: ${result.interior_color || 'Not found'}`);
        console.log(`  Transmission: ${result.transmission || 'Not found'}`);
        console.log(`  Location: ${result.location?.city || 'Not found'}, ${result.location?.state || 'Not found'}`);
        console.log(`  Status: ${result.status}`);
        console.log(`  Sold Date: ${result.sold_date || 'Not found'}`);
        console.log(`  Options: ${result.options_text ? result.options_text.substring(0, 100) + '...' : 'Not found'}`);
      } else {
        console.log('❌ Failed to extract detail (returned null)');
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }
}

testBaTDetail().catch(console.error);