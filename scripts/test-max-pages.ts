#!/usr/bin/env npx tsx
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables if .env.local exists
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Import the scraper
import { BrightDataPuppeteer } from '../lib/scrapers/bright-data-puppeteer';

async function testMaxPages() {
  console.log('🧪 Testing maxPages parameter in BaT scraper\n');
  
  const scraper = new BrightDataPuppeteer();
  const testUrl = 'https://bringatrailer.com/porsche/718-cayman-gt4-rs/';
  
  // Test 1: With maxPages = 1 (should click Show More only once)
  console.log('Test 1: maxPages = 1');
  console.log('Expected: Should click "Show More" only 1 time');
  console.log('----------------------------------------');
  
  try {
    const startTime1 = Date.now();
    const result1 = await scraper.scrapeBaTResults(testUrl, new Set(), 1);
    const elapsed1 = Math.round((Date.now() - startTime1) / 1000);
    
    // Count listings found
    const listingCount1 = result1.listings ? result1.listings.length : 0;
    console.log(`✅ Completed in ${elapsed1} seconds`);
    console.log(`   Found ${listingCount1} listings`);
    console.log(`   HTML size: ${result1.html ? Math.round(result1.html.length / 1024) : 0} KB`);
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
  }
  
  console.log('\n');
  
  // Test 2: With maxPages = 3 (should click Show More 3 times)
  console.log('Test 2: maxPages = 3');
  console.log('Expected: Should click "Show More" 3 times');
  console.log('----------------------------------------');
  
  try {
    const startTime2 = Date.now();
    const result2 = await scraper.scrapeBaTResults(testUrl, new Set(), 3);
    const elapsed2 = Math.round((Date.now() - startTime2) / 1000);
    
    // Count listings found
    const listingCount2 = result2.listings ? result2.listings.length : 0;
    console.log(`✅ Completed in ${elapsed2} seconds`);
    console.log(`   Found ${listingCount2} listings`);
    console.log(`   HTML size: ${result2.html ? Math.round(result2.html.length / 1024) : 0} KB`);
    
    // Verify that maxPages=3 got more listings than maxPages=1
    if (result2.listings && result1.listings && result2.listings.length > result1.listings.length) {
      console.log(`   ✅ Got more listings with maxPages=3 (${listingCount2}) than maxPages=1 (${listingCount1})`);
    }
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
  }
  
  console.log('\n========================================');
  console.log('Test Summary:');
  console.log('The maxPages parameter should control how many times');
  console.log('the scraper clicks "Show More" on BaT pages.');
  console.log('Each click loads approximately 35-40 new listings.');
  console.log('========================================');
}

// Run the test
testMaxPages().catch(console.error);