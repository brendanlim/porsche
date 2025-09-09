// Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
import * as cheerio from 'cheerio';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING CLASSIC.COM SCRAPER - DEBUG MODE');
  console.log('='.repeat(80) + '\n');
  
  // Import scraper after dotenv is loaded
  const { ClassicScraper } = await import('../lib/scrapers/classic');
  const { BrightDataClient } = await import('../lib/scrapers/bright-data');
  
  try {
    // First, let's fetch a single detail page and analyze it
    const brightData = new BrightDataClient();
    const testUrl = 'https://www.classic.com/veh/2023-porsche-911-turbo-s-cabriolet-wp0cd2a99ps271719-48gZJ3M/';
    
    console.log('Fetching test URL:', testUrl);
    const html = await brightData.fetch(testUrl);
    console.log('HTML fetched, length:', html.length);
    
    const $ = cheerio.load(html);
    
    // Test different selectors to find what works
    console.log('\n=== TESTING SELECTORS ===\n');
    
    // Title variations
    const titleSelectors = ['h1', 'h2', '.font-bold', '[class*="title"]', '[class*="heading"]'];
    for (const selector of titleSelectors) {
      const element = $(selector).first();
      if (element.length) {
        console.log(`${selector}: "${element.text().trim().substring(0, 100)}"`);
      }
    }
    
    console.log('\n--- PRICE SELECTORS ---');
    // Price variations
    const priceSelectors = [
      '[class*="price"]',
      '.text-xl',
      '[class*="currency"]',
      'span:contains("$")',
      'div:contains("$")'
    ];
    for (const selector of priceSelectors) {
      const elements = $(selector);
      elements.each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('$') && i < 3) {
          console.log(`${selector}: "${text}"`);
        }
      });
    }
    
    console.log('\n--- STATUS INDICATORS ---');
    // Check for sold/auction indicators
    const statusText = $('body').text();
    const isSold = statusText.includes('Sold for') || statusText.includes('Sale Date');
    const isAuction = statusText.includes('Current Bid') || statusText.includes('Auction');
    console.log('Is Sold?', isSold);
    console.log('Is Auction?', isAuction);
    
    // Look for specific Classic.com patterns
    console.log('\n--- CLASSIC.COM SPECIFIC ---');
    
    // Check for data attributes
    $('[data-vin]').each((i, el) => {
      console.log('Found data-vin:', $(el).attr('data-vin'));
    });
    
    // Check for script tags with data
    $('script').each((i, script) => {
      const scriptText = $(script).html() || '';
      if (scriptText.includes('window.') && scriptText.includes('vehicle')) {
        console.log('Found vehicle data in script tag');
      }
    });
    
    // Now test the actual scraper
    console.log('\n=== TESTING ACTUAL SCRAPER ===\n');
    const classicScraper = new ClassicScraper();
    const results = await classicScraper.scrapeListings({
      maxPages: 1,
      onlySold: false
    });
    
    console.log(`\n✅ Classic.com: ${results.length} listings found`);
    
    if (results.length > 0) {
      console.log('\nSample listings:');
      results.slice(0, 3).forEach((listing, i) => {
        console.log(`${i + 1}. ${listing.title} - $${listing.price}`);
        console.log(`   Model: ${listing.model}, Year: ${listing.year}, Mileage: ${listing.mileage}`);
        console.log(`   VIN: ${listing.vin || 'N/A'}`);
        console.log(`   Status: ${listing.status || 'N/A'}`);
      });
    }
  } catch (error) {
    console.error('❌ Classic.com failed:', error);
  }
}

main().catch(console.error);