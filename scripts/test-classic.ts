import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { ClassicScraper } from '../lib/scrapers/classic';

async function testClassic() {
  console.log('Testing Classic.com scraper...\n');
  
  try {
    const scraper = new ClassicScraper();
    const results = await scraper.scrapeListings({
      maxPages: 1,
      onlySold: true
    });
    
    console.log(`✅ Classic.com: ${results.length} sold listings found`);
    
    if (results.length > 0) {
      console.log('\nSample listing:');
      const sample = results[0];
      console.log('  Title:', sample.title);
      console.log('  Model:', sample.model);
      console.log('  Trim:', sample.trim);
      console.log('  Year:', sample.year);
      console.log('  Price:', sample.price);
      console.log('  Mileage:', sample.mileage);
      console.log('  URL:', sample.url);
    }
  } catch (error) {
    console.error('❌ Classic.com failed:', error);
  }
}

testClassic().catch(console.error);