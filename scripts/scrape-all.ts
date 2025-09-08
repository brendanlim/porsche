// Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Delay imports until after dotenv is loaded

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('COMPREHENSIVE PORSCHE DATA SCRAPING - ALL SOURCES');
  console.log('='.repeat(80));
  console.log('Sources: BaT, Classic.com, Cars.com, Edmunds, Cars and Bids');
  console.log('Golden Rule: Storage is cheap, scraping is not');
  console.log('Organization: source/model/trim/date/type/');
  console.log('='.repeat(80) + '\n');
  
  // Import scrapers after dotenv is loaded
  const { BaTScraper } = await import('../lib/scrapers/bat');
  const { ClassicScraper } = await import('../lib/scrapers/classic');
  const { CarsAndBidsScraper } = await import('../lib/scrapers/carsandbids');
  const { EdmundsScraper } = await import('../lib/scrapers/edmunds');
  const { CarsScraper } = await import('../lib/scrapers/cars');
  
  const results = {
    bat: 0,
    classic: 0,
    carsAndBids: 0,
    edmunds: 0,
    cars: 0,
    total: 0
  };

  // Run Bring a Trailer scraper (PRIORITY - best data)
  console.log('='.repeat(50));
  console.log('1. Scraping Bring a Trailer (Priority Source)...');
  console.log('='.repeat(50));
  try {
    const batScraper = new BaTScraper();
    const batResults = await batScraper.scrapeListings({
      maxPages: 10,  // More pages for BaT as it's our best source
      onlySold: true
    });
    results.bat = batResults.length;
    console.log(`✅ Bring a Trailer: ${batResults.length} sold listings\n`);
  } catch (error) {
    console.error('❌ Bring a Trailer failed:', error);
  }

  // Run Classic.com scraper
  console.log('='.repeat(50));
  console.log('2. Scraping Classic.com...');
  console.log('='.repeat(50));
  try {
    const classicScraper = new ClassicScraper();
    const classicResults = await classicScraper.scrapeListings({
      maxPages: 5,
      onlySold: true
    });
    results.classic = classicResults.length;
    console.log(`✅ Classic.com: ${classicResults.length} sold listings\n`);
  } catch (error) {
    console.error('❌ Classic.com failed:', error);
  }

  // Run Cars and Bids scraper
  console.log('='.repeat(50));
  console.log('3. Scraping Cars and Bids...');
  console.log('='.repeat(50));
  try {
    const cabScraper = new CarsAndBidsScraper();
    const cabResults = await cabScraper.scrapeListings({
      maxPages: 5,
      onlySold: true
    });
    results.carsAndBids = cabResults.length;
    console.log(`✅ Cars and Bids: ${cabResults.length} sold listings\n`);
  } catch (error) {
    console.error('❌ Cars and Bids failed:', error);
  }

  // Run Edmunds scraper
  console.log('='.repeat(50));
  console.log('4. Scraping Edmunds...');
  console.log('='.repeat(50));
  try {
    const edmundsScraper = new EdmundsScraper();
    const edmundsResults = await edmundsScraper.scrapeListings({
      maxPages: 5,
      onlySold: true
    });
    results.edmunds = edmundsResults.length;
    console.log(`✅ Edmunds: ${edmundsResults.length} sold listings\n`);
  } catch (error) {
    console.error('❌ Edmunds failed:', error);
  }

  // Run Cars.com scraper
  console.log('='.repeat(50));
  console.log('5. Scraping Cars.com...');
  console.log('='.repeat(50));
  try {
    const carsScraper = new CarsScraper();
    const carsResults = await carsScraper.scrapeListings({
      maxPages: 5,
      onlySold: true
    });
    results.cars = carsResults.length;
    console.log(`✅ Cars.com: ${carsResults.length} sold listings\n`);
  } catch (error) {
    console.error('❌ Cars.com failed:', error);
  }

  // Summary
  results.total = results.bat + results.classic + results.carsAndBids + results.edmunds + results.cars;
  
  console.log('='.repeat(50));
  console.log('SCRAPING COMPLETE');
  console.log('='.repeat(50));
  console.log(`Total listings scraped: ${results.total}`);
  console.log(`  - Bring a Trailer: ${results.bat}`);
  console.log(`  - Classic.com: ${results.classic}`);
  console.log(`  - Cars and Bids: ${results.carsAndBids}`);
  console.log(`  - Edmunds: ${results.edmunds}`);
  console.log(`  - Cars.com: ${results.cars}`);
  console.log('\nData stored with organization:');
  console.log('  source/model/trim/date/type/');
  
  if (results.total === 0) {
    console.log('\n⚠️ No listings were scraped. Check scraper configurations.');
  } else {
    console.log('\n✅ Data successfully stored in database!');
  }
}

main().catch(console.error);