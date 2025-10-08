import { BaTScraperSB } from '@/lib/scrapers/bat-sb';

async function test() {
  const scraper = new BaTScraperSB();
  const url = 'https://bringatrailer.com/listing/1979-porsche-930-turbo-134/';

  console.log('Testing 1979 Porsche 930 VIN extraction...\n');

  try {
    const listing = await scraper.scrapeDetail(url);

    console.log('=== SCRAPED DATA ===');
    console.log('Title:', listing.title);
    console.log('VIN:', listing.vin || 'NOT FOUND ❌');
    console.log('Mileage:', listing.mileage || 'NOT FOUND ❌');
    console.log('Price:', listing.price);
    console.log('Year:', listing.year);
    console.log('');
    console.log('Expected VIN: 9309800390');
    console.log('Expected Mileage: 160000');
  } catch (error) {
    console.error('Error:', error);
  }
}

test().catch(console.error);
