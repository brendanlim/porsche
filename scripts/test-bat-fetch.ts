// Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BrightDataClient } from '../lib/scrapers/bright-data';
import * as cheerio from 'cheerio';

async function test() {
  const client = new BrightDataClient();
  
  console.log('Testing BaT model page fetch...');
  const modelUrl = 'https://bringatrailer.com/porsche/911-gt3/';
  const html = await client.fetch(modelUrl);
  
  console.log('HTML length:', html.length);
  
  const $ = cheerio.load(html);
  console.log('Title:', $('title').text());
  
  // Check for listing selectors
  const listings1 = $('a[href*="/listing/"]').length;
  const listings2 = $('.listing-card').length;
  const listings3 = $('.auctions-item').length;
  const listings4 = $('.auction-title').length;
  
  console.log('Found listings:');
  console.log('  - a[href*="/listing/"]:', listings1);
  console.log('  - .listing-card:', listings2);
  console.log('  - .auctions-item:', listings3);
  console.log('  - .auction-title:', listings4);
  
  // Show first few listing URLs
  const firstListings = $('a[href*="/listing/"]').slice(0, 5);
  console.log('\nFirst 5 listing URLs:');
  firstListings.each((i, el) => {
    console.log(`  ${i + 1}. ${$(el).attr('href')}`);
  });
}

test().catch(console.error);