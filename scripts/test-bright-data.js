#!/usr/bin/env node

/**
 * Test Bright Data Unlocker API connection
 */

require('dotenv').config({ path: '.env.local' });

async function testBrightData() {
  console.log('========================================');
  console.log('    Bright Data Unlocker Test');
  console.log('========================================\n');

  // Check credentials
  const creds = {
    customerId: process.env.BRIGHT_DATA_CUSTOMER_ID,
    password: process.env.BRIGHT_DATA_PASSWORD,
    zone: process.env.BRIGHT_DATA_ZONE || 'unlocker',
    apiKey: process.env.BRIGHT_DATA_API_KEY,
  };

  console.log('📋 Credentials Check:');
  console.log(`  Customer ID: ${creds.customerId ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Password: ${creds.password ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Zone: ${creds.zone}`);
  console.log(`  API Key: ${creds.apiKey ? '✅ Set' : '❌ Missing'}`);

  if (!creds.customerId || !creds.password) {
    console.log('\n❌ Missing required credentials!');
    console.log('\n📝 To get your Bright Data credentials:');
    console.log('1. Log in to your Bright Data dashboard');
    console.log('2. Go to "Scraping Browser" or "Web Unlocker"');
    console.log('3. Find your zone credentials:');
    console.log('   - Customer ID (e.g., c_kr3mfp2k)');
    console.log('   - Password (zone password)');
    console.log('   - Zone name (e.g., unlocker or scraping_browser1)');
    return;
  }

  console.log('\n🔧 Testing connection...\n');

  try {
    // Dynamic import for ES modules
    const { BrightDataClient } = await import('../lib/scrapers/bright-data.ts');
    
    const client = new BrightDataClient();
    const success = await client.test();
    
    if (success) {
      console.log('✅ Bright Data Unlocker is working!');
      
      console.log('\n📊 Testing BaT scraping with Bright Data...');
      const testUrl = 'https://bringatrailer.com/porsche/';
      const html = await client.fetch(testUrl);
      
      if (html && html.includes('Porsche')) {
        console.log('✅ Successfully fetched BaT page!');
        console.log(`   Page size: ${(html.length / 1024).toFixed(1)} KB`);
        
        // Count listings on page
        const listingCount = (html.match(/listing-card|auction-card/g) || []).length;
        console.log(`   Found ${listingCount} potential listings on page`);
      }
    } else {
      console.log('❌ Bright Data test failed');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔑 Authentication failed. Check your credentials.');
    } else if (error.response?.status === 403) {
      console.log('\n🚫 Access denied. Make sure your zone is configured for Web Unlocker.');
    }
  }

  console.log('\n========================================');
  console.log('\n🚀 Ready to scrape? Test with:');
  console.log(`curl -X POST http://localhost:3000/api/scrape \\
  -H "Authorization: Bearer ${process.env.SCRAPER_API_KEY || 'YOUR_SCRAPER_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{"source": "bat", "maxPages": 1}'`);
}

testBrightData().catch(console.error);