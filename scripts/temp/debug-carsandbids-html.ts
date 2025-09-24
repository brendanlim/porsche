#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { BrightDataBrowser } from '../../lib/scrapers/bright-data-browser';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function debugCarsAndBidsHTML() {
  console.log('Debugging Cars and Bids HTML response\n');

  const brightData = new BrightDataBrowser();

  try {
    const url = 'https://carsandbids.com/search/porsche';
    console.log(`Fetching: ${url}\n`);

    const html = await brightData.fetchWithJS(url);

    // Save HTML for inspection
    fs.writeFileSync('/tmp/carsandbids-debug.html', html);
    console.log('HTML saved to /tmp/carsandbids-debug.html');
    console.log(`HTML length: ${html.length} characters\n`);

    // Parse and check for content
    const $ = cheerio.load(html);

    console.log('Page title:', $('title').text());
    console.log('');

    // Check for various selectors
    const selectors = [
      'li.auction-item',
      '.auction-item',
      '.auction-tile',
      '.results-item',
      '.search-result',
      'a[href*="/auctions/"]',
      '[data-auction]',
      '.listing',
      '.card',
      'article'
    ];

    console.log('Checking for auction elements:');
    for (const selector of selectors) {
      const count = $(selector).length;
      if (count > 0) {
        console.log(`  ✓ ${selector}: ${count} elements`);

        // Show first element's HTML
        const firstEl = $(selector).first();
        const html = firstEl.html()?.substring(0, 200);
        console.log(`    Preview: ${html}...\n`);
      }
    }

    // Check for any Porsche mentions
    const porscheCount = $('*:contains("Porsche")').length;
    console.log(`\nElements containing "Porsche": ${porscheCount}`);

    // Check for any links to auctions
    const auctionLinks = $('a[href*="/auctions/"]');
    console.log(`\nAuction links found: ${auctionLinks.length}`);
    if (auctionLinks.length > 0) {
      console.log('First 3 auction links:');
      auctionLinks.slice(0, 3).each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        console.log(`  - ${text}: ${href}`);
      });
    }

    // Check body classes for clues
    const bodyClasses = $('body').attr('class');
    console.log(`\nBody classes: ${bodyClasses}`);

    // Check for any error messages or blocks
    const possibleErrors = [
      '*:contains("blocked")',
      '*:contains("captcha")',
      '*:contains("error")',
      '*:contains("denied")',
      '*:contains("forbidden")'
    ];

    console.log('\nChecking for potential blocks:');
    for (const selector of possibleErrors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`  ⚠️  Found: ${selector} (${elements.length} elements)`);
        const text = elements.first().text().substring(0, 100);
        console.log(`     Text: ${text}`);
      }
    }

    // Check main content area
    const mainContent = $('main, #main, .main-content, [role="main"]');
    console.log(`\nMain content areas found: ${mainContent.length}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

debugCarsAndBidsHTML().catch(console.error);