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

async function testEdmundsScraper() {
  console.log('🚗 Testing Edmunds scraper...\n');
  
  const config = {
    customerId: process.env.BRIGHT_DATA_CUSTOMER_ID,
    zone: process.env.BRIGHT_DATA_ZONE,
    password: process.env.BRIGHT_DATA_PASSWORD
  };
  
  const proxyUrl = `http://brd-customer-${config.customerId}-zone-${config.zone}:${config.password}@brd.superproxy.io:33335`;
  
  // Test URL for 911 GT3
  const testUrl = 'https://www.edmunds.com/inventory/srp.html?make=Porsche&model=911';
  
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
      '.inventory-listing',
      '.vehicle-card',
      'a[href*="/inventory/"]',
      'a.usurp-inventory-card-vdp-link',
      'div[data-testid="vehicle-card"]',
      '.srp-list-item',
      'article[data-testid="srp-listing"]'
    ];
    
    console.log('\n📋 Testing selectors:');
    for (const selector of selectors) {
      const count = $(selector).length;
      console.log(`  ${selector}: ${count} matches`);
    }
    
    // Try to extract data
    const listings: any[] = [];
    const vehicleCards = $('.inventory-listing, .vehicle-card, a.usurp-inventory-card-vdp-link').slice(0, 5);
    
    vehicleCards.each((i, elem) => {
      const $elem = $(elem);
      const listing: any = {};
      
      // Title/Model
      const title = $elem.find('h1, .vehicle-title, .listing-title, .size-16.text-cool-gray-10').text().trim();
      if (title) listing.title = title;
      
      // Price
      const price = $elem.find('.price, .vehicle-price, .listing-price, .heading-3').text().trim();
      if (price) listing.price = price;
      
      // Mileage
      const mileage = $elem.find('.mileage, .vehicle-mileage, span.text-cool-gray-30').text().trim();
      if (mileage) listing.mileage = mileage;
      
      // VIN
      const vin = $elem.find('.vin, [data-vin], div[data-testid="vin"]').text().trim();
      if (vin) listing.vin = vin;
      
      // Link
      const link = $elem.attr('href') || $elem.find('a').attr('href');
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
    
    // Check page title to see if we got the right page
    const pageTitle = $('title').text();
    console.log('\nPage title:', pageTitle);
    
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

testEdmundsScraper();