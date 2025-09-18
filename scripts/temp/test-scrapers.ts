#!/usr/bin/env npx tsx
// Test each scraper individually to see which ones work

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('Loaded environment variables from .env.local\n');
}

async function testScrapers() {
  console.log('=' .repeat(80));
  console.log('TESTING ALL SCRAPERS - Status Report');
  console.log('=' .repeat(80));
  console.log('Date:', new Date().toISOString());
  console.log('=' .repeat(80) + '\n');

  const results: any = {};

  // Test BaT Scraper
  console.log('1. Testing Bring a Trailer (BaT)...');
  try {
    const { BaTScraperPuppeteer } = await import('../../lib/scrapers/bat-puppeteer');
    const scraper = new BaTScraperPuppeteer();
    const listings = await scraper.scrapeListings({ 
      model: '911', 
      maxPages: 1,
      onlySold: true 
    });
    results.bat = { status: '✅ WORKING', count: listings.length };
    console.log(`   ✅ SUCCESS: Found ${listings.length} listings\n`);
  } catch (error: any) {
    results.bat = { status: '❌ FAILED', error: error.message };
    console.log(`   ❌ FAILED: ${error.message}\n`);
  }

  // Test Classic.com Scraper
  console.log('2. Testing Classic.com...');
  try {
    const { ClassicScraper } = await import('../../lib/scrapers/classic');
    const scraper = new ClassicScraper();
    const listings = await scraper.scrapeListings({ 
      model: '911', 
      maxPages: 1,
      onlySold: true 
    });
    results.classic = { status: '✅ WORKING', count: listings.length };
    console.log(`   ✅ SUCCESS: Found ${listings.length} listings\n`);
  } catch (error: any) {
    results.classic = { status: '❌ FAILED', error: error.message };
    console.log(`   ❌ FAILED: ${error.message}\n`);
  }

  // Test Cars and Bids
  console.log('3. Testing Cars and Bids...');
  try {
    const { CarsAndBidsScraper } = await import('../../lib/scrapers/carsandbids');
    const scraper = new CarsAndBidsScraper();
    const listings = await scraper.scrapeListings({ 
      model: '911', 
      maxPages: 1,
      onlySold: true 
    });
    results.carsandbids = { status: '✅ WORKING', count: listings.length };
    console.log(`   ✅ SUCCESS: Found ${listings.length} listings\n`);
  } catch (error: any) {
    results.carsandbids = { status: '❌ FAILED', error: error.message };
    console.log(`   ❌ FAILED: ${error.message}\n`);
  }

  // Test Edmunds
  console.log('4. Testing Edmunds...');
  try {
    const { EdmundsScraper } = await import('../../lib/scrapers/edmunds');
    const scraper = new EdmundsScraper();
    const listings = await scraper.scrapeListings({ 
      model: '911', 
      maxPages: 1,
      onlySold: true 
    });
    results.edmunds = { status: '✅ WORKING', count: listings.length };
    console.log(`   ✅ SUCCESS: Found ${listings.length} listings\n`);
  } catch (error: any) {
    results.edmunds = { status: '❌ FAILED', error: error.message };
    console.log(`   ❌ FAILED: ${error.message}\n`);
  }

  // Test Cars.com
  console.log('5. Testing Cars.com...');
  try {
    const { CarsScraper } = await import('../../lib/scrapers/cars');
    const scraper = new CarsScraper();
    const listings = await scraper.scrapeListings({ 
      model: '911', 
      maxPages: 1,
      onlySold: true 
    });
    results.cars = { status: '✅ WORKING', count: listings.length };
    console.log(`   ✅ SUCCESS: Found ${listings.length} listings\n`);
  } catch (error: any) {
    results.cars = { status: '❌ FAILED', error: error.message };
    console.log(`   ❌ FAILED: ${error.message}\n`);
  }

  // Summary
  console.log('=' .repeat(80));
  console.log('SUMMARY');
  console.log('=' .repeat(80));
  
  const working = Object.entries(results).filter(([_, r]: any) => r.status.includes('✅'));
  const failed = Object.entries(results).filter(([_, r]: any) => r.status.includes('❌'));
  
  console.log(`\n✅ Working Scrapers (${working.length}/${Object.keys(results).length}):`);
  working.forEach(([name, result]: any) => {
    console.log(`   - ${name}: ${result.count} listings`);
  });
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed Scrapers (${failed.length}/${Object.keys(results).length}):`);
    failed.forEach(([name, result]: any) => {
      console.log(`   - ${name}: ${result.error}`);
    });
  }
  
  console.log('\n' + '=' .repeat(80));
}

testScrapers().catch(console.error);