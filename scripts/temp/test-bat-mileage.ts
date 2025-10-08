import { BaTScraperSB } from '@/lib/scrapers/bat-sb';

async function test() {
  const scraper = new BaTScraperSB();
  const url = 'https://bringatrailer.com/listing/2015-porsche-boxster-s-10/';

  console.log('Testing BaT mileage extraction...\n');
  const listing = await scraper.scrapeDetail(url);

  console.log('=== SCRAPED DATA ===');
  console.log('Title:', listing.title);
  console.log('VIN:', listing.vin);
  console.log('Mileage:', listing.mileage);
  console.log('Price:', listing.price);
  console.log('Year:', listing.year);
}

test().catch(console.error);
