import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BaTScraperPuppeteer } from '../lib/scrapers/bat-puppeteer';

async function test() {
  console.log('Testing BaT Puppeteer scraper with Show More button clicking...\n');
  
  const scraper = new BaTScraperPuppeteer();
  
  // Test with just 1 model to see if pagination works
  const results = await scraper.scrapeListings({
    maxPages: 2,
    onlySold: true
  });
  
  console.log(`\n✅ Total listings scraped: ${results.length}`);
  
  // Show some sample results
  if (results.length > 0) {
    console.log('\nSample results:');
    results.slice(0, 10).forEach(r => {
      console.log(`- ${r.title}: $${r.price?.toLocaleString()} (${r.status})`);
    });
  }
}

test().catch(console.error);