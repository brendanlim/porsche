import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BrightDataClient } from '../lib/scrapers/bright-data';
import * as cheerio from 'cheerio';
import { supabaseAdmin } from '../lib/supabase/admin';

// Try the /auctions/results/ endpoint with model filters
const RESULTS_URLS = [
  'https://bringatrailer.com/auctions/results/?make=porsche&model=981-cayman',
  'https://bringatrailer.com/auctions/results/?make=porsche&model=cayman-gt4',
  'https://bringatrailer.com/auctions/results/?make=porsche&model=991-gt3',
  'https://bringatrailer.com/auctions/results/?make=porsche&model=992-gt3',
  'https://bringatrailer.com/auctions/results/?make=porsche&model=997-gt3',
  'https://bringatrailer.com/auctions/results/?make=porsche&model=996-gt3',
];

async function scrapeBaTResults() {
  const client = new BrightDataClient();
  
  console.log('Attempting to scrape BaT Auction Results pages...\n');
  
  for (const url of RESULTS_URLS.slice(0, 2)) { // Test first 2
    console.log(`\nFetching: ${url}`);
    
    try {
      const html = await client.fetch(url);
      const $ = cheerio.load(html);
      
      console.log('Page title:', $('title').text());
      
      // Look for listing cards or results
      const listings = $('.listing-card, .auction-result, .result-card, [class*="listing"], [class*="result"]');
      console.log(`Found ${listings.length} potential listings`);
      
      // Check first few items
      listings.slice(0, 3).each((i, el) => {
        const $item = $(el);
        const text = $item.text().replace(/\s+/g, ' ').trim().substring(0, 200);
        console.log(`  Item ${i + 1}: ${text}`);
      });
      
      // Look for sold indicators
      const soldIndicators = $('*:contains("Sold for")').length;
      console.log(`Found ${soldIndicators} elements containing "Sold for"`);
      
      // Save for inspection
      const fs = await import('fs');
      const fileName = `debug-bat-results-${url.split('model=')[1]}.html`;
      fs.writeFileSync(fileName, html);
      console.log(`Saved to ${fileName}`);
      
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
    }
  }
}

scrapeBaTResults().catch(console.error);