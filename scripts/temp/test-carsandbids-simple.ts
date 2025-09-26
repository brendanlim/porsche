#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testCarsAndBidsPastAuctions() {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;

  console.log('🧪 Testing Cars & Bids Past Auctions with ScrapingBee');
  console.log('═'.repeat(60));

  // Test with extraction rules for past auctions
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
    const text = await response.text();

    if (response.ok) {
      console.log('✅ Request successful');
      console.log('Response length:', text.length);

      // Check if it contains auction items
      const auctionCount = (text.match(/auction-item/g) || []).length;
      console.log(`Found ${auctionCount} auction-item elements`);

      // Check if it contains Porsche
      const porscheCount = (text.match(/porsche/gi) || []).length;
      console.log(`Found ${porscheCount} mentions of Porsche`);

      // Check for CloudFront error
      if (text.includes('403 ERROR')) {
        console.error('❌ CloudFront 403 error detected');
      }
    } else {
      console.error('❌ Request failed. Status:', response.status);
      console.error('Response:', text.substring(0, 500));
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCarsAndBidsPastAuctions().catch(console.error);