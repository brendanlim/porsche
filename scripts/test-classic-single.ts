// Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING CLASSIC.COM SINGLE LISTING SCRAPE & SAVE');
  console.log('='.repeat(80) + '\n');
  
  const { ClassicScraper } = await import('../lib/scrapers/classic');
  
  try {
    const classicScraper = new ClassicScraper();
    
    // Test scraping just one page with one listing
    console.log('Scraping Classic.com with minimal settings...');
    const results = await classicScraper.scrapeListings({
      maxPages: 1,  // Just 1 page
      onlySold: false  // Get any listings
    });
    
    console.log(`\n✅ Classic.com scraping complete: ${results.length} listings found`);
    
    if (results.length > 0) {
      console.log('\nFirst listing details:');
      const listing = results[0];
      console.log(JSON.stringify(listing, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Classic.com failed:', error);
  }
}

main().catch(console.error);