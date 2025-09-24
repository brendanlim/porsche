#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

import { CarsAndBidsPuppeteerScraper } from '../../lib/scrapers/carsandbids-puppeteer';

async function quickTest() {
  console.log('Quick test - searching for Porsche only\n');

  const scraper = new CarsAndBidsPuppeteerScraper();

  const listings = await scraper.scrapeListings({
    maxPages: 1,
    onlySold: false
  });

  console.log(`\nFound ${listings.length} listings`);

  // Check for GT3s in the results
  const gt3s = listings.filter(l =>
    l.title.toLowerCase().includes('gt3') ||
    (l.trim && l.trim.toLowerCase().includes('gt3'))
  );

  console.log(`Found ${gt3s.length} GT3 listings\n`);

  if (gt3s.length > 0) {
    console.log('GT3 Listings:');
    gt3s.forEach(l => {
      console.log(`- ${l.title}`);
      console.log(`  URL: ${l.url}`);
      console.log(`  Model: ${l.model}, Trim: ${l.trim}`);
    });
  }

  process.exit(0);
}

quickTest().catch(console.error);