import * as cheerio from 'cheerio';
import { ScrapingBeePuppeteer } from '@/lib/scrapers/sb-puppeteer';

async function debug() {
  const sb = new ScrapingBeePuppeteer(process.env.SCRAPINGBEE_API_KEY!);
  const url = 'https://bringatrailer.com/listing/2016-porsche-911-r-33/';

  console.log('Fetching listing...\n');
  const result = await sb.scrapeListingPage(url);
  const $ = cheerio.load(result.html);

  console.log('=== LOOKING FOR MILEAGE ===\n');

  // Check title
  const title = $('h1').text();
  console.log('Title:', title);
  const titleMatch = title.match(/(\d{1,3}(?:,\d{3})*)\s*(?:miles?|mi\b)/i);
  console.log('Title mileage match:', titleMatch);

  // Check for "k Miles" pattern
  const bodyText = $.text();
  const kMilesMatch = bodyText.match(/(\d{1,3})k\s*Miles/i);
  console.log('k Miles match:', kMilesMatch);

  // Check essentials
  const essentialsText = $('.essentials, .listing-details, [class*="essential"]').text();
  console.log('\nEssentials text (first 300 chars):');
  console.log(essentialsText.substring(0, 300));

  // Look for VIN + mileage pattern
  const vinMileageMatch = essentialsText.match(/WP[01][A-Z0-9]{14}(\d{1,3})k\s*Miles/i);
  console.log('\nVIN+Mileage match:', vinMileageMatch);

  // Check for Mileage label
  console.log('\n=== CHECKING FOR MILEAGE LABEL ===');
  $('dt').each((i, el) => {
    const label = $(el).text().trim().toLowerCase();
    if (label.includes('mileage') || label.includes('miles')) {
      const value = $(el).next('dd').text().trim();
      console.log(`Found dt: "${label}" -> "${value}"`);
    }
  });
}

debug().catch(console.error);
