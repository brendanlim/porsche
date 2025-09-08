import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BrightDataClient } from '../lib/scrapers/bright-data';
import * as cheerio from 'cheerio';

async function debugBaTSold() {
  const client = new BrightDataClient();
  
  console.log('Fetching a BaT search page to debug sold detection...\n');
  
  const url = 'https://bringatrailer.com/porsche/991-gt3/';
  
  try {
    const html = await client.fetch(url);
    const $ = cheerio.load(html);
    
    console.log('Page title:', $('title').text());
    console.log('\n=== Analyzing listing cards ===\n');
    
    // Find all listing cards
    const cards = $('.listing-card');
    console.log(`Found ${cards.length} listing cards\n`);
    
    // Analyze first few cards
    cards.slice(0, 3).each((i, el) => {
      const $card = $(el);
      console.log(`\nCard ${i + 1}:`);
      console.log('  Link:', $card.find('a').first().attr('href'));
      
      // Look for any price/sold indicators
      const cardText = $card.text();
      console.log('  Full text:', cardText.replace(/\s+/g, ' ').trim().substring(0, 200));
      
      // Check for various sold indicators
      const statsText = $card.find('.listing-stats-value').text();
      console.log('  Stats text:', statsText);
      
      // Check for sold badge
      const badges = $card.find('.badge, .label, .tag').map((i, el) => $(el).text()).get();
      console.log('  Badges:', badges);
      
      // Check for price info
      const priceText = $card.find('[class*="price"], [class*="sold"], [class*="bid"]').map((i, el) => $(el).text()).get();
      console.log('  Price elements:', priceText);
      
      // Check if sold
      const isSold = cardText.includes('Sold for') || 
                    cardText.includes('Sold on') ||
                    (statsText.includes('$') && !cardText.includes('Current Bid'));
      console.log('  Is sold?:', isSold);
    });
    
    // Save HTML for inspection
    const fs = await import('fs');
    fs.writeFileSync('debug-bat-page.html', html);
    console.log('\n\nFull HTML saved to debug-bat-page.html for inspection');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugBaTSold().catch(console.error);