import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BrightDataClient } from '../lib/scrapers/bright-data';
import * as cheerio from 'cheerio';

async function analyzeBaTHTML() {
  const brightData = new BrightDataClient();
  
  console.log('Fetching and analyzing BaT HTML structure...\n');
  
  const url = 'https://bringatrailer.com/listing/2022-porsche-911-gt3-31/';
  console.log(`URL: ${url}\n`);
  
  try {
    const html = await brightData.fetch(url);
    const $ = cheerio.load(html);
    
    // Check page title
    const title = $('h1.listing-title').text().trim() || 
                  $('h1').first().text().trim() ||
                  $('meta[property="og:title"]').attr('content') || '';
    console.log(`Title: ${title}\n`);
    
    // Look for mileage in various locations
    console.log('=== MILEAGE SEARCH ===');
    
    // Method 1: essentials-item
    const essentials = $('.essentials-item').toArray();
    console.log(`Found ${essentials.length} essentials-item elements:`);
    essentials.forEach((el) => {
      const text = $(el).text().trim();
      if (text.toLowerCase().includes('mile') || text.includes('km')) {
        console.log(`  - "${text}"`);
      }
    });
    
    // Method 2: listing-essentials
    const listingEssentials = $('.listing-essentials').text();
    if (listingEssentials) {
      console.log(`\nListing essentials text: "${listingEssentials.substring(0, 200)}..."`);
    }
    
    // Method 3: dt/dd pairs
    const dtElements = $('dt').toArray();
    console.log(`\nFound ${dtElements.length} dt elements:`);
    dtElements.forEach((dt) => {
      const label = $(dt).text().trim();
      const value = $(dt).next('dd').text().trim();
      if (label.toLowerCase().includes('mile') || label.toLowerCase().includes('odo')) {
        console.log(`  - ${label}: ${value}`);
      }
    });
    
    // Method 4: Any element with "mileage" in class
    const mileageClasses = $('[class*="mileage"], [class*="mile"], [class*="odometer"]').toArray();
    console.log(`\nFound ${mileageClasses.length} elements with mileage-related classes:`);
    mileageClasses.slice(0, 5).forEach((el) => {
      const className = $(el).attr('class');
      const text = $(el).text().trim().substring(0, 100);
      console.log(`  - class="${className}" text="${text}"`);
    });
    
    // Method 5: Search for text patterns
    const bodyText = $('body').text();
    const mileagePatterns = [
      /(\d{1,3}(?:,\d{3})*)\s*(?:miles|mi\.?)/gi,
      /(?:mileage|odometer)[:\s]+(\d{1,3}(?:,\d{3})*)/gi,
      /(\d{1,3}k)\s*(?:miles|mi\.?)/gi
    ];
    
    console.log('\n=== TEXT PATTERN SEARCH ===');
    mileagePatterns.forEach((pattern, i) => {
      const matches = bodyText.match(pattern);
      if (matches) {
        console.log(`Pattern ${i + 1} matches:`, matches.slice(0, 3));
      }
    });
    
    // Look for VIN
    console.log('\n=== VIN SEARCH ===');
    const vinPatterns = [
      /\b[A-HJ-NPR-Z0-9]{17}\b/g,
      /VIN[:\s]+([A-HJ-NPR-Z0-9]{17})/gi
    ];
    
    vinPatterns.forEach((pattern, i) => {
      const matches = bodyText.match(pattern);
      if (matches) {
        console.log(`VIN Pattern ${i + 1} matches:`, matches.slice(0, 2));
      }
    });
    
    // Look for location
    console.log('\n=== LOCATION SEARCH ===');
    const locationElements = [
      $('.seller-location').text(),
      $('[class*="location"]').first().text(),
      $('span:contains("Location")').next().text()
    ];
    
    locationElements.forEach((loc, i) => {
      if (loc) {
        console.log(`Location method ${i + 1}: "${loc.trim()}"`);
      }
    });
    
    // Look for colors
    console.log('\n=== COLOR SEARCH ===');
    const colorText = bodyText.toLowerCase();
    const exteriorColors = ['black', 'white', 'silver', 'gray', 'grey', 'blue', 'red', 'yellow', 'green', 'orange', 'brown'];
    const foundColors = exteriorColors.filter(color => {
      const pattern = new RegExp(`(?:exterior|paint|color)[^.]*\\b${color}\\b`, 'i');
      return pattern.test(bodyText);
    });
    
    if (foundColors.length > 0) {
      console.log('Potential exterior colors found:', foundColors);
    }
    
    // Check auction status
    console.log('\n=== AUCTION STATUS ===');
    const soldIndicators = [
      $('.listing-available-info').text(),
      $('.sold-for').text(),
      $('span:contains("Sold for")').text()
    ];
    
    soldIndicators.forEach((indicator, i) => {
      if (indicator) {
        console.log(`Sold indicator ${i + 1}: "${indicator.trim()}"`);
      }
    });
    
  } catch (error) {
    console.error('Error fetching page:', error);
  }
}

analyzeBaTHTML().catch(console.error);