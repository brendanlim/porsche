import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BaTScraper } from '../lib/scrapers/bat';

async function testBaTUrl() {
  const scraper = new BaTScraper();
  
  console.log('Testing BaT URL extraction...\n');
  
  await scraper.scrapeListings({
    maxPages: 1,
    onlySold: true
  });
}

testBaTUrl().catch(console.error);