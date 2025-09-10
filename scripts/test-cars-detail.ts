// Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
import * as cheerio from 'cheerio';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING CARS.COM DETAIL PAGE EXTRACTION');
  console.log('='.repeat(80) + '\n');
  
  const { BrightDataClient } = await import('../lib/scrapers/bright-data');
  
  try {
    const brightData = new BrightDataClient();
    // Test a Cars.com detail page
    const detailUrl = 'https://www.cars.com/vehicledetail/7e518be7-40e5-4286-b654-be6713b28a8a/';
    
    console.log('Fetching detail URL:', detailUrl);
    const html = await brightData.fetch(detailUrl);
    console.log('HTML fetched, length:', html.length);
    
    const $ = cheerio.load(html);
    
    // Test title extraction
    console.log('\n=== TITLE EXTRACTION ===');
    const titleCandidates = [
      'h1',
      'h1.listing-title',
      '.title-section h1',
      '[class*="title"]',
      '.vehicle-title'
    ];
    
    for (const selector of titleCandidates) {
      const elements = $(selector);
      if (elements.length > 0) {
        elements.slice(0, 2).each((i, el) => {
          const text = $(el).text().trim();
          if (text.length > 10 && text.length < 200 && !text.includes('Contact')) {
            console.log(`${selector}: "${text}"`);
          }
        });
      }
    }
    
    // Test price extraction
    console.log('\n=== PRICE EXTRACTION ===');
    const priceCandidates = [
      '.price-primary',
      '[class*="price"]',
      'span[data-testid*="price"]',
      '.vehicle-price'
    ];
    
    for (const selector of priceCandidates) {
      const elements = $(selector);
      elements.slice(0, 3).each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('$')) {
          console.log(`${selector}: "${text}"`);
        }
      });
    }
    
    // Look for any element with just a price
    $('*').each((i, el) => {
      const text = $(el).clone().children().remove().end().text().trim();
      const priceMatch = text.match(/^\$[\d,]+$/);
      if (priceMatch) {
        const tagName = (el as any).tagName || el.type || 'unknown';
        const className = $(el).attr('class') || 'no-class';
        if (!className.includes('history')) {
          console.log(`Found price: ${text} in <${tagName} class="${className.substring(0, 50)}">`);
        }
      }
    });
    
    // Test VIN extraction
    console.log('\n=== VIN EXTRACTION ===');
    const bodyText = $('body').text();
    const vinPattern = /\b[A-HJ-NPR-Z0-9]{17}\b/g;
    const vins = bodyText.match(vinPattern);
    if (vins) {
      console.log('Found potential VINs:', vins.slice(0, 3));
    }
    
    // Test mileage extraction
    console.log('\n=== MILEAGE EXTRACTION ===');
    const mileageSelectors = [
      '[class*="mileage"]',
      'li:contains("miles")',
      'dt:contains("Mileage") + dd'
    ];
    
    for (const selector of mileageSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        elements.slice(0, 2).each((i, el) => {
          const text = $(el).text().trim();
          console.log(`${selector}: "${text}"`);
        });
      }
    }
    
    // Check for "Contact seller" text
    console.log('\n=== CHECKING FOR CONTACT SELLER ===');
    const contactElements = $('*:contains("Contact seller")');
    console.log(`Found ${contactElements.length} elements with "Contact seller"`);
    
    if (contactElements.length > 0) {
      console.log('Sample elements:');
      contactElements.slice(0, 3).each((i, el) => {
        console.log(`- ${(el as any).tagName || el.type || 'unknown'} class="${$(el).attr('class') || 'no-class'}"`);
      });
    }
    
    // Check page structure
    console.log('\n=== PAGE STRUCTURE ===');
    console.log('Title tag:', $('title').text());
    console.log('Has listing data?', html.includes('listing-'));
    console.log('Has vehicle data?', html.includes('vehicle-'));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);