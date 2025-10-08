import { CarsAndBidsScraperSB } from '@/lib/scrapers/carsandbids-sb';
import * as cheerio from 'cheerio';

async function test() {
  // First, let's see what the actual price text looks like
  const apiKey = process.env.SCRAPINGBEE_API_KEY;
  const url = 'https://carsandbids.com/auctions/rjjO65ko/2001-porsche-911-carrera-4-coupe';

  const params: any = {
    api_key: apiKey,
    url: url,
    render_js: 'true',
    premium_proxy: 'true',
    country_code: 'us',
    wait: '10000',
    wait_for: 'dt',
    json_response: 'true',
    block_resources: 'false'
  };

  const urlParams = new URLSearchParams(params);
  const response = await fetch(`https://app.scrapingbee.com/api/v1?${urlParams.toString()}`);
  const data = await response.json();
  const $ = cheerio.load(data.body);

  const bodyText = $.text();
  console.log('Price matches:');
  const soldMatch = bodyText.match(/Sold (?:for|after for) \$([0-9,]+)/gi);
  console.log('Sold matches:', soldMatch);

  // Find context around the price
  const priceIndex = bodyText.indexOf('Sold for $23,750');
  if (priceIndex !== -1) {
    console.log('Context around price:', bodyText.substring(priceIndex, priceIndex + 50));
  }

  const scraper = new CarsAndBidsScraperSB();
  console.log('\nTesting Cars and Bids scraper...\n');
  const listing = await scraper.scrapeDetail(url);

  console.log('\n=== SCRAPED DATA ===');
  console.log('Title:', listing.title);
  console.log('VIN:', listing.vin);
  console.log('Price:', listing.price);
  console.log('Mileage:', listing.mileage);
  console.log('Exterior Color:', listing.exterior_color);
  console.log('Interior Color:', listing.interior_color);
  console.log('Transmission:', listing.transmission);
  console.log('\nOptions:');
  if (listing.options_text) {
    listing.options_text.split('\n').forEach(opt => {
      console.log(`  - ${opt}`);
    });
  } else {
    console.log('  (none)');
  }
}

test().catch(console.error);
