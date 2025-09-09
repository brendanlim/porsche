// Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
import * as cheerio from 'cheerio';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING CLASSIC.COM DETAIL PAGE EXTRACTION');
  console.log('='.repeat(80) + '\n');
  
  const { BrightDataClient } = await import('../lib/scrapers/bright-data');
  
  try {
    const brightData = new BrightDataClient();
    // Get a specific listing URL from the search results
    const detailUrl = 'https://www.classic.com/veh/2012-porsche-911-carrera-gts-wp0ab2a95cs720409-p6Q5kOW/';
    
    console.log('Fetching detail URL:', detailUrl);
    const html = await brightData.fetch(detailUrl);
    console.log('HTML fetched, length:', html.length);
    
    const $ = cheerio.load(html);
    
    // Test title extraction
    console.log('\n=== TITLE EXTRACTION ===');
    const titleCandidates = [
      'h1',
      'h2', 
      '.text-3xl',
      '.text-4xl',
      '.font-bold',
      '[class*="title"]'
    ];
    
    for (const selector of titleCandidates) {
      const elements = $(selector);
      if (elements.length > 0) {
        elements.slice(0, 2).each((i, el) => {
          const text = $(el).text().trim();
          if (text.length > 10 && text.length < 200) {
            console.log(`${selector}: "${text}"`);
          }
        });
      }
    }
    
    // Test price extraction
    console.log('\n=== PRICE EXTRACTION ===');
    // Look for elements containing dollar amounts
    $('*').each((i, el) => {
      const text = $(el).clone().children().remove().end().text().trim();
      const priceMatch = text.match(/^\$[\d,]+$/);
      if (priceMatch) {
        const tagName = el.tagName;
        const className = $(el).attr('class') || 'no-class';
        console.log(`Found price: ${text} in <${tagName} class="${className.substring(0, 50)}">`);
      }
    });
    
    // Check for "Sold for" pattern
    const bodyText = $('body').text();
    const soldMatch = bodyText.match(/Sold\s+for\s+\$[\d,]+/i);
    if (soldMatch) {
      console.log(`Found sold price pattern: ${soldMatch[0]}`);
    }
    
    // Test VIN extraction
    console.log('\n=== VIN EXTRACTION ===');
    // Look for VIN pattern (17 characters)
    const vinPattern = /\b[A-HJ-NPR-Z0-9]{17}\b/g;
    const vins = bodyText.match(vinPattern);
    if (vins) {
      console.log('Found potential VINs:', vins.slice(0, 3));
    }
    
    // Look for specific VIN labels
    $('*').each((i, el) => {
      const text = $(el).text();
      if (text.includes('VIN:') || text.includes('Chassis')) {
        console.log('VIN label found:', text.substring(0, 100));
      }
    });
    
    // Test mileage extraction
    console.log('\n=== MILEAGE EXTRACTION ===');
    const mileagePatterns = [
      /(\d{1,3}(?:,\d{3})*)\s*(?:miles?|mi\b)/i,
      /(\d+k)\s*(?:miles?|mi\b)/i
    ];
    
    for (const pattern of mileagePatterns) {
      const matches = bodyText.match(pattern);
      if (matches) {
        console.log('Mileage found:', matches[0]);
      }
    }
    
    // Check for sold/active status
    console.log('\n=== STATUS CHECK ===');
    const isSold = bodyText.includes('Sold for') || bodyText.includes('Sale Date');
    const isActive = bodyText.includes('For Sale') || bodyText.includes('Current Price');
    const isAuction = bodyText.includes('Current Bid') || bodyText.includes('Auction');
    
    console.log('Is Sold?', isSold);
    console.log('Is Active?', isActive);
    console.log('Is Auction?', isAuction);
    
    // Check page structure
    console.log('\n=== PAGE STRUCTURE ===');
    console.log('Title tag:', $('title').text());
    console.log('Has Phoenix LiveView?', html.includes('data-phx-view'));
    console.log('Has window.__INITIAL_STATE__?', html.includes('window.__INITIAL_STATE__'));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);