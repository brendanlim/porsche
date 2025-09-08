import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BaTScraperNew } from '../lib/scrapers/bat-new';

async function test() {
  console.log('Testing new BaT scraper with pagination...\n');
  
  const scraper = new BaTScraperNew();
  
  // Test with just 2 pages to see if pagination works
  const results = await scraper.scrapeListings({
    maxPages: 2,
    onlySold: true
  });
  
  console.log(`\n✅ Total listings scraped: ${results.length}`);
  
  // Show some sample results
  if (results.length > 0) {
    console.log('\nSample results:');
    results.slice(0, 5).forEach(r => {
      console.log(`- ${r.title}: $${r.price?.toLocaleString()} (${r.status})`);
    });
  }
}

test().catch(console.error);