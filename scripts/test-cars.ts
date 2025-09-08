#!/usr/bin/env npx tsx
import dotenv from 'dotenv';
import path from 'path';

// Load env vars first
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Set SSL bypass for Bright Data
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as cheerio from 'cheerio';

async function testCarsScraper() {
  console.log('🚗 Testing Cars.com scraper...\n');
  
  const config = {
    customerId: process.env.BRIGHT_DATA_CUSTOMER_ID,
    zone: process.env.BRIGHT_DATA_ZONE,
    password: process.env.BRIGHT_DATA_PASSWORD
  };
  
  const proxyUrl = `http://brd-customer-${config.customerId}-zone-${config.zone}:${config.password}@brd.superproxy.io:33335`;
  
  // Test URL for GT3  
  const testUrl = 'https://www.cars.com/shopping/results/?makes[]=porsche&models[]=porsche-911';
  
  console.log('Testing URL:', testUrl);
  console.log('Using proxy...\n');
  
  try {
    const response = await axios.get(testUrl, {
      httpsAgent: new HttpsProxyAgent(proxyUrl),
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    console.log('✅ Successfully fetched page');
    console.log('Response status:', response.status);
    console.log('Content length:', response.data.length);
    
    const $ = cheerio.load(response.data);
    
    // Try different selectors
    const selectors = [
      'div.vehicle-card',
      'article.car-card',
      'div[data-testid="vehicle-card"]',
      'a[href*="/vehicledetail/"]',
      '.vehicle-listing',
      '.inventory-listing'
    ];
    
    console.log('\n📋 Testing selectors:');
    for (const selector of selectors) {
      const count = $(selector).length;
      console.log(`  ${selector}: ${count} matches`);
    }
    
    // Try to extract data from vehicle cards
    const listings: any[] = [];
    const vehicleCards = $('div.vehicle-card, article.car-card').slice(0, 5);
    
    vehicleCards.each((i, elem) => {
      const $elem = $(elem);
      const listing: any = {};
      
      // Title/Model
      const title = $elem.find('h2.title, h3.title, .vehicle-title').text().trim();
      if (title) listing.title = title;
      
      // Price
      const price = $elem.find('.primary-price, .vehicle-price').text().trim();
      if (price) listing.price = price;
      
      // Mileage
      const mileage = $elem.find('.mileage').text().trim();
      if (mileage) listing.mileage = mileage;
      
      // Link
      const link = $elem.find('a[href*="/vehicledetail/"]').attr('href');
      if (link) listing.link = link;
      
      if (Object.keys(listing).length > 0) {
        listings.push(listing);
      }
    });
    
    console.log(`\n🚙 Found ${listings.length} listings`);
    if (listings.length > 0) {
      console.log('\nSample listing:');
      console.log(JSON.stringify(listings[0], null, 2));
    }
    
    // Check if we're getting blocked
    if (response.data.includes('blocked') || response.data.includes('captcha')) {
      console.log('\n⚠️  Page might be showing a captcha or block message');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
    }
  }
}

testCarsScraper();