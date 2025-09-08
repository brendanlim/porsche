import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BrightDataClient } from '../lib/scrapers/bright-data';
import * as cheerio from 'cheerio';

async function analyzeBaTEssentials() {
  const brightData = new BrightDataClient();
  
  console.log('🔍 Analyzing BaT Essentials section...\n');
  
  const url = 'https://bringatrailer.com/listing/2022-porsche-911-gt3-31/';
  console.log(`URL: ${url}\n`);
  
  try {
    const html = await brightData.fetch(url);
    const $ = cheerio.load(html);
    
    console.log('=== SEARCHING FOR BAT ESSENTIALS ===\n');
    
    // Look for "Listing details" or "BaT Essentials"
    const essentialsSelectors = [
      '.listing-essentials',
      '.essentials',
      '.listing-details',
      '[class*="essentials"]',
      'section:contains("Listing Details")',
      'div:contains("BaT Essentials")'
    ];
    
    essentialsSelectors.forEach(selector => {
      const element = $(selector);
      if (element.length > 0) {
        console.log(`Found with selector "${selector}": ${element.length} element(s)`);
      }
    });
    
    // Look for list items that might contain the details
    console.log('\n=== ANALYZING LIST ITEMS ===\n');
    
    // Find all ul/li combinations
    $('ul').each((i, ul) => {
      const items = $(ul).find('li');
      
      // Check if this list contains VIN or mileage
      let hasRelevantInfo = false;
      items.each((j, li) => {
        const text = $(li).text().trim();
        if (text.includes('VIN') || text.includes('Miles') || text.includes('Paint') || text.includes('$')) {
          hasRelevantInfo = true;
        }
      });
      
      if (hasRelevantInfo) {
        console.log(`Found relevant list (ul #${i}):`);
        items.each((j, li) => {
          const text = $(li).text().trim();
          if (text.length > 5 && text.length < 200) {
            console.log(`  • ${text}`);
            
            // Try to identify what this is
            if (text.includes('WP0')) {
              console.log(`    → VIN FOUND: ${text}`);
            }
            if (text.match(/\d+k?\s*Miles/i)) {
              console.log(`    → MILEAGE FOUND: ${text}`);
            }
            if (text.includes('Paint-To-Sample') || text.includes('Paint')) {
              console.log(`    → COLOR/OPTION FOUND: ${text}`);
            }
            if (text.includes('Total Price') || text.includes('MSRP')) {
              console.log(`    → ORIGINAL PRICE FOUND: ${text}`);
            }
          }
        });
        console.log('');
      }
    });
    
    // Look for specific patterns in the whole page
    console.log('=== PATTERN SEARCH ===\n');
    
    const bodyText = $('body').text();
    
    // VIN pattern (Porsche VINs start with WP0 or WP1)
    const vinPattern = /WP[01][A-Z0-9]{14}/g;
    const vinMatches = bodyText.match(vinPattern);
    if (vinMatches) {
      console.log('VIN patterns found:', vinMatches);
    }
    
    // Mileage pattern
    const mileagePattern = /(\d+k?)\s*Miles/gi;
    const mileageMatches = bodyText.match(mileagePattern);
    if (mileageMatches) {
      console.log('Mileage patterns found:', [...new Set(mileageMatches)]);
    }
    
    // Paint-to-Sample pattern
    const ptsPattern = /Paint-To-Sample\s+([^,\n.]+)/gi;
    const ptsMatches = bodyText.match(ptsPattern);
    if (ptsMatches) {
      console.log('Paint-to-Sample patterns found:', ptsMatches);
    }
    
    // Original price pattern
    const pricePattern = /Total Price of \$(\d+k?)/gi;
    const priceMatches = bodyText.match(pricePattern);
    if (priceMatches) {
      console.log('Original price patterns found:', priceMatches);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

analyzeBaTEssentials().catch(console.error);