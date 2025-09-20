import { BaTScraper } from '../../lib/scrapers/bat';
import dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const testUrl = 'https://bringatrailer.com/listing/2004-porsche-911-gt3-64/';

async function testScraper() {
  console.log('Testing BaT scraper on:', testUrl);
  console.log('─'.repeat(70));

  const scraper = new BaTScraper();

  // First, fetch the page HTML
  console.log('\n📥 Fetching page HTML...');
  const html = await (scraper as any).fetchUrl(testUrl, 'detail', '911', 'gt3');

  // Save HTML for inspection
  fs.writeFileSync('/tmp/bat-test-page.html', html);
  console.log('Saved HTML to /tmp/bat-test-page.html');

  // Now test the scraper's parsing
  console.log('\n📊 Running scraper...');
  const result = await scraper.scrapeDetail(testUrl, '911', 'gt3');

  if (result) {
    console.log('\n✅ Scraper Result:');
    console.log('   • Title:', result.title);
    console.log('   • Mileage:', result.mileage);
    console.log('   • VIN:', result.vin);
    console.log('   • Price:', result.price);
    console.log('   • Year:', result.year);
  } else {
    console.log('❌ No result from scraper (listing may not be sold)');
  }

  // Now search the HTML for mileage patterns
  console.log('\n🔍 Searching HTML for mileage patterns:');
  console.log('─'.repeat(50));

  // Look for "8k Miles" specifically
  const eightKPattern = /8[kK]\s*(?:-?[Mm]ile|[Mm]iles)/g;
  const matches8k = [...html.matchAll(eightKPattern)];
  console.log(`\n✅ Found "8k Miles" patterns: ${matches8k.length} occurrences`);
  if (matches8k.length > 0) {
    matches8k.forEach((match, idx) => {
      const start = Math.max(0, match.index! - 100);
      const end = Math.min(html.length, match.index! + match[0].length + 100);
      const context = html.substring(start, end).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      console.log(`  ${idx + 1}. "${match[0]}"`);
      console.log(`     Context: ...${context}...`);
    });
  }

  // Look for "186k" pattern
  const pattern186k = /186[kK]\s*(?:-?[Mm]ile|[Mm]iles)/g;
  const matches186k = [...html.matchAll(pattern186k)];
  console.log(`\n❌ Found "186k Miles" patterns: ${matches186k.length} occurrences`);
  if (matches186k.length > 0) {
    matches186k.forEach((match, idx) => {
      const start = Math.max(0, match.index! - 100);
      const end = Math.min(html.length, match.index! + match[0].length + 100);
      const context = html.substring(start, end).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      console.log(`  ${idx + 1}. "${match[0]}"`);
      console.log(`     Context: ...${context}...`);
    });
  }

  // Look for any XXXk pattern
  const anyKPattern = /(\d+)[kK]\s*(?:-?[Mm]ile|[Mm]iles)/g;
  const allKMatches = [...html.matchAll(anyKPattern)];
  console.log(`\n📋 All "XXk Miles" patterns found:`);
  const uniqueValues = new Set(allKMatches.map(m => parseInt(m[1]) * 1000));
  console.log(`   Unique values: ${Array.from(uniqueValues).sort((a, b) => a - b).join(', ')}`);
}

testScraper().catch(console.error);