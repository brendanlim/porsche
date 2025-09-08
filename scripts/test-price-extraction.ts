import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BaTScraper } from '../lib/scrapers/bat';
import * as cheerio from 'cheerio';

// Test cases for BaT price extraction
const testCases = [
  {
    name: 'Standard sold listing',
    html: '<div class="listing-available-info">Sold for USD $120,000 on 8/29/22</div>',
    expectedPrice: 120000
  },
  {
    name: 'No USD prefix',
    html: '<div class="listing-available-info">Sold for $85,500 on 8/29/22</div>',
    expectedPrice: 85500
  },
  {
    name: 'Large price with commas',
    html: '<div class="listing-available-info">Sold for USD $1,250,000 on 8/29/22</div>',
    expectedPrice: 1250000
  },
  {
    name: 'Price in body text',
    html: '<body>The auction ended with a winning bid of $177,000</body>',
    expectedPrice: 177000
  },
  {
    name: 'Sold for pattern in text',
    html: '<p>This beautiful GT3 sold for $325,000 to a lucky buyer</p>',
    expectedPrice: 325000
  },
  {
    name: 'No price found',
    html: '<div>Auction is still active</div>',
    expectedPrice: null
  },
  {
    name: 'Small price should be ignored',
    html: '<div class="listing-available-info">Sold for $500</div>',
    expectedPrice: null
  }
];

async function runTests() {
  console.log('Running BaT Price Extraction Tests\n');
  console.log('='.repeat(60));
  
  const scraper = new BaTScraper();
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    const $ = cheerio.load(testCase.html);
    
    // Access private method via any cast (for testing)
    const extractedPrice = (scraper as any).extractSoldPrice($, testCase.html);
    
    const success = extractedPrice === testCase.expectedPrice;
    
    console.log(`\nTest: ${testCase.name}`);
    console.log(`HTML: ${testCase.html.substring(0, 100)}...`);
    console.log(`Expected: ${testCase.expectedPrice ? '$' + testCase.expectedPrice.toLocaleString() : 'null'}`);
    console.log(`Extracted: ${extractedPrice ? '$' + extractedPrice.toLocaleString() : 'null'}`);
    console.log(`Result: ${success ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
  console.log(`Success Rate: ${Math.round((passed / testCases.length) * 100)}%`);
  
  // Additional live test with real listing
  console.log('\n' + '='.repeat(60));
  console.log('\nLive Test with Real BaT Listing:');
  
  try {
    const result = await scraper.scrapeDetail('https://bringatrailer.com/listing/2016-porsche-cayman-gt4-114/');
    if (result) {
      console.log(`Title: ${result.title}`);
      console.log(`Price: ${result.price ? '$' + result.price.toLocaleString() : 'Not found'}`);
      console.log(`Status: ${result.status}`);
      console.log(`Result: ${result.price === 120000 ? '✅ PASSED' : '❌ FAILED (expected $120,000)'}`);
    }
  } catch (error) {
    console.error('Live test failed:', error);
  }
}

runTests().catch(console.error);