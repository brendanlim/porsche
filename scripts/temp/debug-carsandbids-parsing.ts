#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import puppeteer from 'puppeteer-core';
import * as cheerio from 'cheerio';

async function debugCarsAndBidsParsing() {
  console.log('Debugging Cars and Bids HTML parsing\n');

  const customerId = process.env.BRIGHT_DATA_CUSTOMER_ID || 'hl_cd9a1035';
  const password = process.env.BRIGHT_DATA_BROWSER_PASSWORD || 'y2w8rf96p2na';
  const zone = 'pt_scraping_browser_z1';
  const browserWSEndpoint = `wss://brd-customer-${customerId}-zone-${zone}:${password}@brd.superproxy.io:9222`;

  let browser;
  try {
    browser = await puppeteer.connect({ browserWSEndpoint });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const url = 'https://carsandbids.com/search/porsche%20gt3';
    console.log(`Fetching: ${url}\n`);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    await page.waitForSelector('a[href*="/auctions/"]', { timeout: 15000 });

    const html = await page.content();
    const $ = cheerio.load(html);

    console.log('Analyzing page structure:\n');

    // Check various selectors
    const selectors = [
      'li.auction-item',
      '.auction-item',
      'a[href*="/auctions/"]',
      '[data-testid*="auction"]',
      '.search-result',
      '.listing-card'
    ];

    for (const selector of selectors) {
      const count = $(selector).length;
      console.log(`${selector}: ${count} elements`);
    }

    // Get the first few auction links and analyze them
    console.log('\nFirst 3 auction elements:');
    $('a[href*="/auctions/"]').slice(0, 3).each((i, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      const text = $el.text().trim();
      const parentClass = $el.parent().attr('class');

      console.log(`\n${i + 1}. Link: ${href}`);
      console.log(`   Text: ${text}`);
      console.log(`   Parent class: ${parentClass}`);

      // Look for title in various places
      const title = $el.find('.auction-title').text().trim() ||
                   $el.find('h3').text().trim() ||
                   $el.find('h2').text().trim() ||
                   text;
      console.log(`   Extracted title: ${title}`);

      // Check if it's a GT3
      if (title.toLowerCase().includes('gt3')) {
        console.log('   ✓ This is a GT3!');
      } else {
        console.log('   ✗ Not a GT3');
      }
    });

    await page.close();

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (browser) await browser.close();
  }
}

debugCarsAndBidsParsing().catch(console.error);