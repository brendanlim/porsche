import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BaTScraper } from '../lib/scrapers/bat';

async function debugBaTScraper() {
  const scraper = new BaTScraper();
  
  console.log('🔍 Debugging BaT scraper...\n');
  
  try {
    // Run the scraper with just 1 page to debug
    const results = await scraper.scrapeListings({ 
      maxPages: 1,
      onlySold: true 
    });
    
    console.log(`\n📊 Final results: ${results.length} listings scraped`);
    
    if (results.length > 0) {
      console.log('\nFirst result:');
      console.log(JSON.stringify(results[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

debugBaTScraper().catch(console.error);