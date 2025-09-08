import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BaTScraper } from '../lib/scrapers/bat';
import * as cheerio from 'cheerio';

async function checkBaTJson() {
  const scraper = new BaTScraper();
  
  console.log('Fetching BaT search page to examine JSON structure...\n');
  
  const html = await (scraper as any).fetchViaBrightData('https://bringatrailer.com/porsche/');
  const $ = cheerio.load(html);
  
  // Find the embedded JSON
  const scriptTags = $('script').toArray();
  
  for (const script of scriptTags) {
    const scriptContent = $(script).html() || '';
    
    if (scriptContent.includes('auctionsCompletedInitialData')) {
      const jsonMatch = scriptContent.match(/auctionsCompletedInitialData\s*:\s*(\[[^\]]*\])/);
      
      if (jsonMatch) {
        try {
          const auctionData = JSON.parse(jsonMatch[1]);
          
          if (auctionData.length > 0) {
            console.log('Sample item from embedded JSON:');
            console.log(JSON.stringify(auctionData[0], null, 2));
            
            console.log('\nAvailable fields in first item:');
            console.log(Object.keys(auctionData[0]));
            
            // Look for URL-related fields
            const item = auctionData[0];
            console.log('\nURL-related fields:');
            if (item.url) console.log('  url:', item.url);
            if (item.link) console.log('  link:', item.link);
            if (item.href) console.log('  href:', item.href);
            if (item.slug) console.log('  slug:', item.slug);
            if (item.listing_url) console.log('  listing_url:', item.listing_url);
            if (item.auction_url) console.log('  auction_url:', item.auction_url);
            
            // Check if title contains mileage
            console.log('\nTitle/subtitle fields:');
            if (item.title) console.log('  title:', item.title);
            if (item.subtitle) console.log('  subtitle:', item.subtitle);
            if (item.titlesub) console.log('  titlesub:', item.titlesub);
            
            // Look for sold price
            console.log('\nPrice fields:');
            if (item.sold_text) console.log('  sold_text:', item.sold_text);
            if (item.price) console.log('  price:', item.price);
            if (item.sold_price) console.log('  sold_price:', item.sold_price);
          }
        } catch (e) {
          console.error('Error parsing JSON:', e);
        }
      }
    }
  }
}

checkBaTJson().catch(console.error);