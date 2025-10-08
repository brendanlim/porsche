import { BaTScraperSB } from '@/lib/scrapers/bat-sb';

async function test() {
  const scraper = new BaTScraperSB();
  const url = 'https://bringatrailer.com/listing/2016-porsche-911-r-33/';

  console.log('Testing 2016 Porsche 911 R VIN extraction...\n');

  try {
    const listing = await scraper.scrapeDetail(url);

    console.log('=== SCRAPED DATA ===');
    console.log('Title:', listing.title);
    console.log('VIN:', listing.vin || 'NOT FOUND ❌');
    console.log('Mileage:', listing.mileage);
    console.log('Price:', listing.price);
    console.log('Year:', listing.year);
  } catch (error) {
    console.error('Error:', error);
  }
}

test().catch(console.error);
