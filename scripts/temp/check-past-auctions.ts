#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv';
import path from 'path';
import * as cheerio from 'cheerio';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkPastAuctions() {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;
  const url = 'https://carsandbids.com/past-auctions';

  const params = new URLSearchParams({
    api_key: apiKey!,
    url: url,
    render_js: 'true',
    wait: '5000',
    premium_proxy: 'true',
    country_code: 'us'
  });

  const response = await fetch(`https://app.scrapingbee.com/api/v1?${params.toString()}`);
  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('Page title:', $('title').text());
  console.log('Auction items:', $('.auction-item').length);

  // Get first few auction items
  console.log('\nFirst 3 auction items:');
  $('.auction-item').slice(0, 3).each((i, el) => {
    const $el = $(el);
    const text = $el.text();

    // Extract key parts
    const soldMatch = text.match(/Sold for \$[\d,]+/);
    const titleMatch = text.match(/\d{4}\s+[A-Za-z].+?(?=Sold|$)/);

    console.log(`\n${i + 1}.`);
    console.log('  Full text:', text.substring(0, 100) + '...');
    console.log('  Sold price:', soldMatch ? soldMatch[0] : 'not found');
    console.log('  Title guess:', titleMatch ? titleMatch[0] : 'not found');

    // Try link
    const link = $el.find('a[href*="/auctions/"]').first().attr('href');
    console.log('  Link:', link || 'not found');
  });
}

checkPastAuctions().catch(console.error);