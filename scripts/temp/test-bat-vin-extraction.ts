import { BaTScraperSB } from '@/lib/scrapers/bat-sb';

async function test() {
  const scraper = new BaTScraperSB();
  const url = 'https://bringatrailer.com/listing/1976-porsche-930-turbo-carrera-29/';

  console.log('Testing BaT VIN extraction...\n');
  console.log('URL:', url);
  console.log('');

  try {
    const listing = await scraper.scrapeDetail(url);

    console.log('=== SCRAPED DATA ===');
    console.log('Title:', listing.title);
    console.log('VIN:', listing.vin || 'NOT FOUND');
    console.log('Mileage:', listing.mileage || 'NOT FOUND');
    console.log('Price:', listing.price);
    console.log('Year:', listing.year);
    console.log('Model:', listing.model);
    console.log('Trim:', listing.trim);
  } catch (error) {
    console.error('Error:', error);
  }
}

test().catch(console.error);
