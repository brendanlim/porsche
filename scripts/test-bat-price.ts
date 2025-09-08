import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BrightDataClient } from '../lib/scrapers/bright-data';
import * as cheerio from 'cheerio';

async function testBaTPrice() {
  const client = new BrightDataClient();
  
  // Test a specific sold listing
  const url = 'https://bringatrailer.com/listing/2016-porsche-cayman-gt4-114/';
  console.log('Fetching:', url);
  
  const html = await client.fetch(url);
  const $ = cheerio.load(html);
  
  console.log('\nTitle:', $('h1').first().text().trim());
  
  // Look for price in listing stats
  console.log('\n=== Listing Stats Values ===');
  $('.listing-stats-value').each((i, el) => {
    const text = $(el).text().trim();
    console.log(`[${i}]: ${text}`);
  });
  
  // Look for essentials
  console.log('\n=== Essentials Items ===');
  $('.essentials-item').each((i, el) => {
    const label = $(el).find('.essentials-item-title').text().trim();
    const value = $(el).find('.essentials-item-value').text().trim();
    console.log(`${label}: ${value}`);
  });
  
  // Look for sold-specific elements
  console.log('\n=== Sold-specific elements ===');
  const soldSelectors = [
    '.sold-for',
    '.final-price',
    '.auction-results',
    '[class*="sold"]',
    '.listing-available-info'
  ];
  
  for (const selector of soldSelectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      console.log(`\n${selector}: found ${elements.length}`);
      elements.each((i, el) => {
        if (i < 3) {
          console.log(`  ${$(el).text().trim().substring(0, 100)}`);
        }
      });
    }
  }
  
  // Search for price patterns in text
  console.log('\n=== Price patterns in page ===');
  const bodyText = $('body').text();
  
  // Look for "Sold for $X" pattern
  const soldForMatches = bodyText.match(/Sold for \$[\d,]+/gi);
  if (soldForMatches) {
    console.log('Found "Sold for" patterns:');
    soldForMatches.forEach(match => console.log(`  ${match}`));
  }
  
  // Look for any large dollar amounts
  const dollarMatches = bodyText.match(/\$[\d,]+(?:,\d{3})*(?:\.\d{2})?/g);
  if (dollarMatches) {
    const largeDollars = dollarMatches
      .map(m => ({ text: m, value: parseInt(m.replace(/[$,]/g, '')) }))
      .filter(m => m.value >= 10000)
      .sort((a, b) => b.value - a.value);
    
    console.log('\nLarge dollar amounts found:');
    largeDollars.slice(0, 10).forEach(m => console.log(`  ${m.text} (${m.value})`));
  }
}

testBaTPrice().catch(console.error);