#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testDetailPage() {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;

  if (!apiKey) {
    console.error('❌ SCRAPINGBEE_API_KEY not found');
    return;
  }

  // Test a specific auction detail page
  const testUrl = 'https://carsandbids.com/auctions/KxOoYvQm/2019-porsche-911-gt3-rs-weissach';

  console.log('🧪 Testing Cars & Bids Detail Page VIN Extraction');
  console.log('URL:', testUrl);
  console.log('═'.repeat(60));

  try {
    // First, try without JavaScript scenario to see what we get
    const params = new URLSearchParams({
      api_key: apiKey,
      url: testUrl,
      render_js: 'true',
      premium_proxy: 'true',
      country_code: 'us',
      wait: '5000'
    });

    const response = await fetch(`https://app.scrapingbee.com/api/v1?${params.toString()}`);
    const html = await response.text();

    if (response.ok) {
      console.log('✅ Page fetched successfully');
      console.log('HTML length:', html.length);

      // Look for VIN patterns in the HTML
      const vinMatches = html.match(/VIN[:\s]*([A-Z0-9]{17})/gi);
      if (vinMatches) {
        console.log('\n🔍 Found VIN patterns:');
        vinMatches.forEach(match => console.log('  -', match));
      } else {
        console.log('\n❌ No VIN found in HTML');

        // Check for alternative VIN locations
        const altVinPattern = /WP[A-Z0-9]{15}/g;
        const altMatches = html.match(altVinPattern);
        if (altMatches) {
          console.log('\n🔍 Found potential Porsche VINs:');
          altMatches.forEach(vin => console.log('  -', vin));
        }
      }

      // Check for mileage
      const mileageMatches = html.match(/([\d,]+)\s*(?:miles?|mi\b)/gi);
      if (mileageMatches) {
        console.log('\n📏 Found mileage patterns:');
        mileageMatches.slice(0, 5).forEach(match => console.log('  -', match));
      }

      // Save a snippet for debugging
      const snippet = html.substring(0, 2000);
      console.log('\n📄 HTML snippet:');
      console.log(snippet);

    } else {
      console.error('❌ Error fetching page:', html);
    }

  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

testDetailPage().catch(console.error);