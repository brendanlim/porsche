#!/usr/bin/env npx tsx
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as cheerio from 'cheerio';

// Load env vars first
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Set SSL bypass for Bright Data
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

interface TestResult {
  source: string;
  url: string;
  success: boolean;
  listings?: number;
  error?: string;
  sampleListing?: any;
}

async function testUrl(source: string, url: string): Promise<TestResult> {
  const config = {
    customerId: process.env.BRIGHT_DATA_CUSTOMER_ID,
    zone: process.env.BRIGHT_DATA_ZONE,
    password: process.env.BRIGHT_DATA_PASSWORD
  };
  
  const proxyUrl = `http://brd-customer-${config.customerId}-zone-${config.zone}:${config.password}@brd.superproxy.io:33335`;
  
  try {
    const response = await axios.get(url, {
      httpsAgent: new HttpsProxyAgent(proxyUrl),
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Different selectors for different sites
    let listings = 0;
    let sampleListing: any = {};
    
    if (source === 'Cars.com') {
      const cards = $('div.vehicle-card');
      listings = cards.length;
      if (listings > 0) {
        const first = cards.first();
        sampleListing = {
          title: first.find('h2.title').text().trim(),
          price: first.find('.primary-price').text().trim(),
          mileage: first.find('.mileage').text().trim()
        };
      }
    } else if (source === 'Classic.com') {
      const links = $('a[href^="/veh/"]');
      listings = links.length;
      if (listings > 0) {
        const first = links.first();
        sampleListing = {
          link: first.attr('href'),
          text: first.text().trim()
        };
      }
    }
    
    return {
      source,
      url,
      success: true,
      listings,
      sampleListing
    };
  } catch (error: any) {
    return {
      source,
      url,
      success: false,
      error: error.message
    };
  }
}

async function testAllScrapers() {
  console.log('🚗 Testing All Scrapers with Bright Data\n');
  console.log('=' .repeat(60));
  
  const tests = [
    {
      source: 'Cars.com',
      urls: [
        'https://www.cars.com/shopping/results/?makes[]=porsche&models[]=porsche-911',
        'https://www.cars.com/shopping/results/?makes[]=porsche&models[]=porsche-718_cayman'
      ]
    },
    {
      source: 'Classic.com',
      urls: [
        'https://www.classic.com/m/porsche/911/992/gt3/',
        'https://www.classic.com/m/porsche/718/cayman/gt4/'
      ]
    }
  ];
  
  const results: TestResult[] = [];
  
  for (const test of tests) {
    console.log(`\n📌 Testing ${test.source}`);
    console.log('-'.repeat(40));
    
    for (const url of test.urls) {
      console.log(`\nTesting: ${url.substring(0, 60)}...`);
      const result = await testUrl(test.source, url);
      results.push(result);
      
      if (result.success) {
        console.log(`✅ Success! Found ${result.listings} listings`);
        if (result.sampleListing && Object.keys(result.sampleListing).length > 0) {
          console.log('Sample:', JSON.stringify(result.sampleListing).substring(0, 100));
        }
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\nTotal tests: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ Working sources:');
    successful.forEach(r => {
      console.log(`  - ${r.source}: ${r.listings} listings`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed sources:');
    failed.forEach(r => {
      console.log(`  - ${r.source}: ${r.error}`);
    });
  }
}

testAllScrapers().catch(console.error);