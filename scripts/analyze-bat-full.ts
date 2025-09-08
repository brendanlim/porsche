import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BrightDataClient } from '../lib/scrapers/bright-data';
import * as cheerio from 'cheerio';

async function analyzeBaTFull() {
  const brightData = new BrightDataClient();
  
  console.log('🔍 Deep analysis of BaT listing structure...\n');
  
  const url = 'https://bringatrailer.com/listing/2022-porsche-911-gt3-31/';
  console.log(`URL: ${url}\n`);
  
  try {
    const html = await brightData.fetch(url);
    const $ = cheerio.load(html);
    
    // 1. Look for embedded JSON data
    console.log('=== JSON DATA SEARCH ===');
    $('script').each((i, el) => {
      const scriptContent = $(el).html() || '';
      
      // Look for various JSON variables
      const jsonPatterns = [
        /var\s+(\w+)\s*=\s*({[^;]+});/g,
        /window\.(\w+)\s*=\s*({[^;]+});/g,
      ];
      
      jsonPatterns.forEach(pattern => {
        const matches = scriptContent.matchAll(pattern);
        for (const match of matches) {
          const varName = match[1];
          if (varName.toLowerCase().includes('listing') || 
              varName.toLowerCase().includes('auction') || 
              varName.toLowerCase().includes('data')) {
            try {
              const jsonData = JSON.parse(match[2]);
              console.log(`Found JSON variable: ${varName}`);
              
              // Look for VIN in JSON
              const searchForVin = (obj: any, path: string = ''): void => {
                for (const key in obj) {
                  const value = obj[key];
                  const currentPath = path ? `${path}.${key}` : key;
                  
                  if (typeof value === 'string') {
                    // Check if it looks like a VIN (17 characters, alphanumeric)
                    if (value.match(/^[A-HJ-NPR-Z0-9]{17}$/)) {
                      console.log(`  Potential VIN found at ${currentPath}: ${value}`);
                    }
                    // Check if key suggests VIN
                    if (key.toLowerCase().includes('vin') && value.length > 0) {
                      console.log(`  VIN field at ${currentPath}: ${value}`);
                    }
                  } else if (typeof value === 'object' && value !== null) {
                    searchForVin(value, currentPath);
                  }
                }
              };
              
              searchForVin(jsonData);
            } catch (e) {
              // JSON parse error
            }
          }
        }
      });
    });
    
    // 2. VIN Search in HTML
    console.log('\n=== VIN SEARCH IN HTML ===');
    const bodyText = $('body').text();
    
    // Look for VIN patterns
    const vinRegex = /\b[A-HJ-NPR-Z0-9]{17}\b/g;
    const vinMatches = bodyText.match(vinRegex);
    if (vinMatches) {
      console.log('17-character strings found:', vinMatches.slice(0, 5));
    }
    
    // Look for VIN label
    const vinLabels = [
      $('dt:contains("VIN")').next('dd').text(),
      $('span:contains("VIN:")').parent().text(),
      $('strong:contains("VIN")').parent().text(),
      $('.listing-essentials:contains("VIN")').text()
    ];
    
    vinLabels.forEach((text, i) => {
      if (text && text.trim()) {
        console.log(`VIN method ${i + 1}: "${text.trim().substring(0, 100)}"`);
      }
    });
    
    // 3. Colors Search
    console.log('\n=== COLORS SEARCH ===');
    
    // Look for color mentions in listing essentials
    const essentialsText = $('.listing-essentials').text();
    const fullText = $('body').text();
    
    // Common color patterns
    const colorPatterns = [
      /(?:exterior|paint|color)[:\s]+([^,\n.]+)/gi,
      /(?:interior)[:\s]+([^,\n.]+)/gi,
      /(\w+)\s+(?:over|\/)\s+(\w+)/gi, // "Black over Tan" pattern
    ];
    
    colorPatterns.forEach((pattern, i) => {
      const matches = fullText.match(pattern);
      if (matches) {
        console.log(`Color pattern ${i + 1}:`, matches.slice(0, 3));
      }
    });
    
    // Look for specific color sections
    const colorSections = [
      $('.post-excerpt').text(),
      $('.listing-text').text(),
      $('div[class*="description"]').text()
    ];
    
    colorSections.forEach((text, i) => {
      if (text) {
        const excerpt = text.substring(0, 200);
        if (excerpt.toLowerCase().includes('color') || 
            excerpt.toLowerCase().includes('paint') ||
            excerpt.toLowerCase().includes('interior')) {
          console.log(`Color section ${i + 1}: "${excerpt}..."`);
        }
      }
    });
    
    // 4. Transmission Search
    console.log('\n=== TRANSMISSION SEARCH ===');
    
    const transPatterns = [
      /(\d+)[\s-]?speed/gi,
      /\b(manual|automatic|PDK|tiptronic|CVT)\b/gi,
      /\b(6MT|7MT|5MT|AT|M\/T|A\/T)\b/g
    ];
    
    transPatterns.forEach((pattern, i) => {
      const matches = fullText.match(pattern);
      if (matches) {
        console.log(`Transmission pattern ${i + 1}:`, [...new Set(matches)].slice(0, 5));
      }
    });
    
    // 5. Location Search
    console.log('\n=== LOCATION SEARCH ===');
    
    // Look for seller location
    const locationSelectors = [
      '.seller-location',
      '.seller-info',
      '[class*="location"]',
      'span:contains("Location")',
      'dt:contains("Location")',
      '.essentials-item:contains("Location")'
    ];
    
    locationSelectors.forEach(selector => {
      const element = $(selector);
      if (element.length > 0) {
        const text = element.text().trim();
        if (text) {
          console.log(`Location selector "${selector}": ${text.substring(0, 100)}`);
        }
      }
    });
    
    // Look for state abbreviations and city patterns
    const statePattern = /\b([A-Z]{2})\b/g;
    const cityStatePattern = /([A-Za-z\s]+),\s*([A-Z]{2})/g;
    
    const stateMatches = fullText.match(statePattern);
    const cityStateMatches = fullText.match(cityStatePattern);
    
    if (cityStateMatches) {
      console.log('City/State patterns found:', cityStateMatches.slice(0, 5));
    }
    
    // 6. Options Search  
    console.log('\n=== OPTIONS SEARCH ===');
    
    // Look for equipment/options sections
    const optionSelectors = [
      '.post-excerpt',
      '.listing-text',
      'ul li',
      '[class*="equipment"]',
      '[class*="options"]',
      '[class*="features"]'
    ];
    
    optionSelectors.forEach(selector => {
      const elements = $(selector);
      if (elements.length > 0) {
        elements.each((i, el) => {
          const text = $(el).text().trim();
          if (text && (text.toLowerCase().includes('sport') || 
                      text.toLowerCase().includes('package') ||
                      text.toLowerCase().includes('chrono') ||
                      text.toLowerCase().includes('ceramic') ||
                      text.toLowerCase().includes('carbon'))) {
            console.log(`Option found in ${selector}: "${text.substring(0, 100)}"`);
            return false; // Break after first match
          }
        });
      }
    });
    
    // Look for bullet points or lists
    const listItems = $('ul li').toArray();
    if (listItems.length > 0) {
      console.log(`\nFound ${listItems.length} list items. First few:`);
      listItems.slice(0, 5).forEach(item => {
        const text = $(item).text().trim();
        if (text.length > 10 && text.length < 200) {
          console.log(`  • ${text}`);
        }
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

analyzeBaTFull().catch(console.error);