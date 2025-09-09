// Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
import * as cheerio from 'cheerio';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING CLASSIC.COM SEARCH PAGE');
  console.log('='.repeat(80) + '\n');
  
  const { BrightDataClient } = await import('../lib/scrapers/bright-data');
  
  try {
    const brightData = new BrightDataClient();
    const searchUrl = 'https://www.classic.com/m/porsche/911/';
    
    console.log('Fetching search URL:', searchUrl);
    const html = await brightData.fetch(searchUrl);
    console.log('HTML fetched, length:', html.length);
    
    const $ = cheerio.load(html);
    
    // Look for listing links
    console.log('\n=== FINDING LISTINGS ===\n');
    
    // Classic.com uses /veh/ URLs for individual listings
    const listingLinks = $('a[href^="/veh/"]');
    console.log(`Found ${listingLinks.length} listing links`);
    
    // Show first 5 links
    listingLinks.slice(0, 5).each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      console.log(`${i + 1}. ${href} - "${text.substring(0, 50)}"`);
    });
    
    // Look for price data in listings
    console.log('\n=== PRICE DATA ===\n');
    
    // Find elements that might contain prices
    const priceElements = $('*').filter((i, el) => {
      const text = $(el).text();
      return text.match(/\$[\d,]+/) && !text.includes('script');
    });
    
    console.log(`Found ${priceElements.length} elements with price patterns`);
    priceElements.slice(0, 5).each((i, el) => {
      const text = $(el).text().trim().substring(0, 100);
      console.log(`- ${text}`);
    });
    
    // Check for data in script tags
    console.log('\n=== CHECKING FOR EMBEDDED DATA ===\n');
    $('script').each((i, script) => {
      const scriptText = $(script).html() || '';
      if (scriptText.includes('window.') && (scriptText.includes('listings') || scriptText.includes('vehicles'))) {
        console.log(`Found potential data in script tag ${i}`);
        // Extract just the variable assignment
        const match = scriptText.match(/window\.(\w+)\s*=\s*({.*?});/s);
        if (match) {
          console.log(`Variable: window.${match[1]}`);
          try {
            const data = JSON.parse(match[2]);
            console.log('Data keys:', Object.keys(data).slice(0, 10));
          } catch (e) {
            console.log('Could not parse as JSON');
          }
        }
      }
    });
    
    // Check page title to verify we got the right page
    console.log('\n=== PAGE INFO ===\n');
    console.log('Title:', $('title').text());
    console.log('Meta description:', $('meta[name="description"]').attr('content'));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);