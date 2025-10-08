import * as cheerio from 'cheerio';
import { ScrapingBeePuppeteer } from '@/lib/scrapers/sb-puppeteer';

async function debug() {
  const sb = new ScrapingBeePuppeteer(process.env.SCRAPINGBEE_API_KEY!);
  const url = 'https://bringatrailer.com/listing/2015-porsche-boxster-s-10/';

  console.log('Fetching BaT listing...\n');
  const result = await sb.scrapeListingPage(url);
  const $ = cheerio.load(result.html);

  console.log('=== LOOKING FOR MILEAGE ===\n');

  // Check essentials section
  const essentialsText = $('.essentials, .listing-details, [class*="essential"]').text();
  console.log('Essentials text (first 500 chars):');
  console.log(essentialsText.substring(0, 500));
  console.log('\n');

  // Look for "k Miles" pattern
  const kMilesMatch = essentialsText.match(/(\d+)k\s*Miles/i);
  console.log('k Miles match:', kMilesMatch);

  // Look for standard Miles pattern
  const standardMilesMatch = essentialsText.match(/(\d{1,3}(?:,\d{3})*)\s*Miles/i);
  console.log('Standard Miles match:', standardMilesMatch);

  // Check title
  const title = $('h1.listing-title').text().trim() || $('h1').first().text().trim();
  console.log('\nTitle:', title);

  // Look for any text containing "Miles" or "miles"
  console.log('\n=== ALL TEXT CONTAINING "Miles" ===');
  $('*').each((i, el) => {
    const text = $(el).text().trim();
    if (text.match(/\d+k?\s*Miles/i) && text.length < 100) {
      console.log(`- ${text}`);
    }
  });
}

debug().catch(console.error);
