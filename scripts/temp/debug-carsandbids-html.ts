#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import * as cheerio from 'cheerio';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugCarsAndBidsHTML() {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;

  console.log('🔍 Debugging Cars & Bids HTML');
  console.log('═'.repeat(60));

  const url = 'https://carsandbids.com/past-auctions?q=porsche';

  const params = new URLSearchParams({
    api_key: apiKey!,
    url: url,
    render_js: 'true',
    premium_proxy: 'true',
    country_code: 'us',
    wait_browser: 'load',
    wait: '5000',
    block_resources: 'false'
  });

  try {
    const response = await fetch(`https://app.scrapingbee.com/api/v1?${params.toString()}`);
    const html = await response.text();

    if (response.ok) {
      console.log('✅ Request successful');
      console.log('HTML length:', html.length);

      // Save HTML for inspection
      const filePath = '/tmp/carsandbids-debug.html';
      fs.writeFileSync(filePath, html);
      console.log(`📄 HTML saved to: ${filePath}`);

      // Parse with cheerio
      const $ = cheerio.load(html);

      // Try different selectors
      console.log('\n🔍 Checking different selectors:');

      const selectors = [
        '.auction-item',
        'li.auction-item',
        '[class*="auction"]',
        'a[href*="/auctions/"]',
        '.auction-title',
        '[class*="grid"] > div',
        '[class*="list"] > div',
        'article',
        '.card',
        '[data-testid*="auction"]'
      ];

      for (const selector of selectors) {
        const count = $(selector).length;
        if (count > 0) {
          console.log(`✅ ${selector}: ${count} elements`);

          // Show first element's HTML structure
          if (count > 0 && selector === '.auction-item') {
            const firstEl = $(selector).first();
            console.log('\n📋 First auction-item structure:');
            console.log('  - HTML:', firstEl.html()?.substring(0, 200) + '...');
            console.log('  - Text:', firstEl.text().substring(0, 100) + '...');

            // Check nested elements
            console.log('\n  Nested elements:');
            console.log('    - a tags:', firstEl.find('a').length);
            console.log('    - Links with /auctions/:', firstEl.find('a[href*="/auctions/"]').length);
            console.log('    - .auction-title:', firstEl.find('.auction-title').length);
            console.log('    - a.auction-title:', firstEl.find('a.auction-title').length);
          }
        }
      }

      // Check what's preventing parsing
      console.log('\n🔍 Checking auction-item links:');
      $('.auction-item').each((i, el) => {
        if (i >= 3) return false; // Only check first 3

        const $el = $(el);
        const links = $el.find('a[href*="/auctions/"]');
        const auctionTitleLink = $el.find('a.auction-title');
        const anyLink = $el.find('a');

        console.log(`\nItem ${i + 1}:`);
        console.log(`  - Has a[href*="/auctions/"]: ${links.length > 0}`);
        console.log(`  - Has a.auction-title: ${auctionTitleLink.length > 0}`);
        console.log(`  - Has any <a> tag: ${anyLink.length}`);

        if (anyLink.length > 0) {
          console.log(`  - First link href: ${anyLink.first().attr('href')}`);
          console.log(`  - First link text: ${anyLink.first().text().trim().substring(0, 50)}`);
        }
      });
    } else {
      console.error('❌ Request failed');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugCarsAndBidsHTML().catch(console.error);