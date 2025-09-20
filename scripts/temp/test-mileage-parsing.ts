import { BaTScraperPuppeteer } from '../../lib/scrapers/bat-puppeteer';
import { BaTScraper } from '../../lib/scrapers/bat';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import * as puppeteer from 'puppeteer';

dotenv.config({ path: '.env.local' });

const testUrl = 'https://bringatrailer.com/listing/2004-porsche-911-gt3-64/';

async function fetchAndTestPage() {
  console.log('Testing mileage parsing for:', testUrl);
  console.log('─'.repeat(70));

  // Use the actual scraper to fetch the page
  const scraper = new BaTScraperPuppeteer();
  const result = await scraper.scrapeDetail(testUrl, '911', 'gt3');

  if (result) {
    console.log('\n📋 Scraper Result:');
    console.log('   • Title:', result.title);
    console.log('   • Mileage:', result.mileage);
    console.log('   • VIN:', result.vin);
    console.log('   • Price:', result.price);
    console.log('   • Year:', result.year);
  } else {
    console.log('No result from scraper');
  }

  // Now fetch the page directly with Bright Data and analyze
  console.log('\n' + '─'.repeat(70));
  console.log('Fetching page directly with Bright Data for analysis...\n');

  const BRIGHT_DATA_USERNAME = process.env.BRIGHT_DATA_PUPPETEER_USERNAME;
  const BRIGHT_DATA_PASSWORD = process.env.BRIGHT_DATA_PUPPETEER_PASSWORD;
  const BRIGHT_DATA_HOST = process.env.BRIGHT_DATA_HOST;

  const auth = `${BRIGHT_DATA_USERNAME}:${BRIGHT_DATA_PASSWORD}`;
  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://${auth}@${BRIGHT_DATA_HOST}`
  });

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);

    console.log('Loading page...');
    await page.goto(testUrl, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(3000);

    // Get the HTML
    const html = await page.content();
    const $ = cheerio.load(html);

    // Look for all occurrences of mileage patterns
    const bodyText = $('body').text();

    console.log('\n🔍 Searching for all mileage patterns in the page:');
    console.log('─'.repeat(50));

    // Pattern 1: "XXk miles" or "XXk-Mile"
    const pattern1 = /(\d+)[Kk]\s*(?:-?[Mm]ile|[Mm]iles)/g;
    const matches1 = [...bodyText.matchAll(pattern1)];
    if (matches1.length > 0) {
      console.log('\n📌 Pattern "XXk miles" matches:');
      matches1.forEach((match, idx) => {
        const context = bodyText.substring(
          Math.max(0, match.index! - 50),
          Math.min(bodyText.length, match.index! + match[0].length + 50)
        );
        console.log(`  ${idx + 1}. "${match[0]}" → ${parseInt(match[1]) * 1000} miles`);
        console.log(`     Context: ...${context.replace(/\s+/g, ' ').trim()}...`);
      });
    }

    // Pattern 2: "XX,XXX miles"
    const pattern2 = /(\d{1,3}(?:,\d{3})*)\s*(?:-?[Mm]ile|[Mm]iles)/g;
    const matches2 = [...bodyText.matchAll(pattern2)];
    if (matches2.length > 0) {
      console.log('\n📌 Pattern "XX,XXX miles" matches:');
      matches2.slice(0, 5).forEach((match, idx) => {
        const context = bodyText.substring(
          Math.max(0, match.index! - 50),
          Math.min(bodyText.length, match.index! + match[0].length + 50)
        );
        console.log(`  ${idx + 1}. "${match[0]}" → ${match[1].replace(/,/g, '')} miles`);
        console.log(`     Context: ...${context.replace(/\s+/g, ' ').trim()}...`);
      });
      if (matches2.length > 5) {
        console.log(`  ... and ${matches2.length - 5} more matches`);
      }
    }

    // Check structured data locations
    console.log('\n📋 Checking structured mileage locations:');
    const locations = {
      'Essentials item': $('.essentials-item:contains("Mileage")').text().trim(),
      'DT/DD pair': $('dt:contains("Mileage")').next('dd').text().trim(),
      'Class with mileage': $('[class*="mileage"]').text().trim(),
      'Info-item': $('.info-item:contains("Mileage")').text().trim(),
      'Listing-essentials': $('.listing-essentials:contains("Mileage")').text().trim()
    };

    for (const [name, value] of Object.entries(locations)) {
      if (value) {
        console.log(`  • ${name}: "${value}"`);
      }
    }

    // Check for VIN location
    console.log('\n🔍 Checking VIN locations:');
    const vinText = $('dt:contains("VIN")').next('dd').text().trim();
    console.log('  VIN from dt/dd:', vinText);

  } finally {
    await browser.close();
  }
}

fetchAndTestPage().catch(console.error);