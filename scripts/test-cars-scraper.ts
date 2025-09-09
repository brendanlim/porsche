// Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Delay imports until after dotenv is loaded

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING CARS.COM SCRAPER');
  console.log('='.repeat(80) + '\n');
  
  // Import scraper after dotenv is loaded
  const { CarsScraper } = await import('../lib/scrapers/cars');
  
  try {
    const carsScraper = new CarsScraper();
    const carsResults = await carsScraper.scrapeListings({
      maxPages: 1,  // Just test 1 page
      onlySold: false  // Get all listings for testing
    });
    
    console.log(`\n✅ Cars.com: ${carsResults.length} listings found`);
    
    if (carsResults.length > 0) {
      console.log('\nSample listings:');
      carsResults.slice(0, 3).forEach((listing, i) => {
        console.log(`${i + 1}. ${listing.title} - $${listing.price}`);
        console.log(`   Model: ${listing.model}, Year: ${listing.year}, Mileage: ${listing.mileage}`);
        console.log(`   VIN: ${listing.vin || 'N/A'}`);
      });
    }
  } catch (error) {
    console.error('❌ Cars.com failed:', error);
  }
}

main().catch(console.error);