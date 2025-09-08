import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BrightDataClient } from '../lib/scrapers/bright-data';
import * as cheerio from 'cheerio';

async function testBaTPage() {
  const client = new BrightDataClient();
  
  // Test the actual 981 Cayman page you showed
  const url = 'https://bringatrailer.com/porsche/981-cayman/';
  console.log('Fetching:', url);
  
  const html = await client.fetch(url);
  const $ = cheerio.load(html);
  
  // Look for listings with sold prices
  $('.listing-card').each((i, el) => {
    const $card = $(el);
    const title = $card.find('.listing-title').text().trim();
    const priceText = $card.find('.listing-stats-value').text();
    const hasPrice = priceText.includes('$');
    const hasSold = priceText.toLowerCase().includes('sold');
    
    console.log(`\nListing ${i + 1}:`);
    console.log('  Title:', title || $card.text().substring(0, 50));
    console.log('  Price text:', priceText);
    console.log('  Has price:', hasPrice);
    console.log('  Has "sold":', hasSold);
  });
  
  // Check what the actual structure is
  console.log('\n\nChecking for price elements:');
  console.log('  .listing-stats-value count:', $('.listing-stats-value').length);
  console.log('  Contains "Sold for":', html.includes('Sold for'));
  console.log('  First price found:', $('.listing-stats-value:contains("$")').first().text());
}

testBaTPage().catch(console.error);