import { BaTScraperSB } from '@/lib/scrapers/bat-sb';

async function test() {
  const scraper = new BaTScraperSB();
  const url = 'https://bringatrailer.com/listing/1977-porsche-930-turbo-6-2/';

  console.log('Testing 1977 Porsche 930 (Kilometers) extraction...\n');

  try {
    const listing = await scraper.scrapeDetail(url);

    console.log('=== SCRAPED DATA ===');
    console.log('Title:', listing.title);
    console.log('VIN:', listing.vin || 'NOT FOUND ❌');
    console.log('Mileage:', listing.mileage || 'NOT FOUND ❌');
    console.log('Price:', listing.price);
    console.log('Year:', listing.year);
    console.log('');
    console.log('Expected VIN: 9307700596');
    console.log('Expected Mileage: 71000 (71k km = ~44k miles)');
  } catch (error) {
    console.error('Error:', error);
  }
}

test().catch(console.error);
