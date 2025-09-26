#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testScrapingBeeRaw() {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;

  if (!apiKey) {
    console.error('❌ SCRAPINGBEE_API_KEY not found');
    return;
  }

  console.log('🧪 Testing ScrapingBee API directly');
  console.log('═'.repeat(60));

  // Test a simple page fetch
  const testUrl = 'https://www.classic.com/m/porsche/911/';
  console.log(`\n📊 Testing URL: ${testUrl}`);

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      url: testUrl,
      render_js: 'false', // Start with simple HTML fetch
      premium_proxy: 'true',
      country_code: 'us'
    });

    const response = await fetch(`https://app.scrapingbee.com/api/v1?${params.toString()}`);

    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const html = await response.text();
      console.log(`✅ Got HTML response: ${html.length} characters`);

      // Check for Porsche content
      if (html.includes('Porsche') || html.includes('911')) {
        console.log('✅ Found Porsche content in response');
      } else {
        console.log('⚠️ No Porsche content found - might be blocked or wrong page');
      }

      // Extract some listings using regex
      const listingMatches = html.match(/href="\/veh\/[^"]+"/g);
      if (listingMatches) {
        console.log(`✅ Found ${listingMatches.length} potential listings`);
        console.log('First 3:', listingMatches.slice(0, 3));
      }

    } else {
      const error = await response.text();
      console.error('❌ Error response:', error.substring(0, 500));
    }

  } catch (error) {
    console.error('❌ Request failed:', error);
  }

  // Test JavaScript rendering
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Testing Cars & Bids with JavaScript rendering');

  const carsAndBidsUrl = 'https://carsandbids.com/search/porsche';

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      url: carsAndBidsUrl,
      render_js: 'true',
      wait: '3000',
      premium_proxy: 'true',
      country_code: 'us'
    });

    const response = await fetch(`https://app.scrapingbee.com/api/v1?${params.toString()}`);

    console.log(`Response status: ${response.status}`);

    if (response.ok) {
      const html = await response.text();
      console.log(`✅ Got HTML response: ${html.length} characters`);

      // Check for auction content
      if (html.includes('auction') || html.includes('Porsche')) {
        console.log('✅ Found auction content in response');
      }

      // Look for auction items
      const auctionMatches = html.match(/auctions\/[^"']+/g);
      if (auctionMatches) {
        console.log(`✅ Found ${auctionMatches.length} potential auctions`);
        console.log('First 3:', auctionMatches.slice(0, 3));
      }

    } else {
      const error = await response.text();
      console.error('❌ Error response:', error.substring(0, 500));
    }

  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

testScrapingBeeRaw().catch(console.error);