import { BaTScraper } from '../../lib/scrapers/bat';
import * as cheerio from 'cheerio';

console.log('Testing BaT Mileage Extraction Fix');
console.log('═'.repeat(50));

const scraper = new BaTScraper();

// Test Case 1: Title with mileage should take priority
const html1 = `
  <html>
    <body>
      <h1 class="listing-title">8k-Mile 2004 Porsche 911 GT3</h1>
      <div class="listing-description">
        This GT3 was delivered new and now has 8k miles.
      </div>
      <div class="comments">
        Someone mentioned they saw a similar one with 175k miles.
      </div>
    </body>
  </html>
`;

const $1 = cheerio.load(html1);
const mileage1 = (scraper as any).extractMileage($1);
console.log('\n✅ Test 1 - Title mileage priority');
console.log('   Expected: 8000, Got:', mileage1);
console.log('   Result:', mileage1 === 8000 ? '✅ PASS' : '❌ FAIL');

// Test Case 2: Various formats
const testCases = [
  { title: '11k-Mile 2005 Porsche 911 GT3', expected: 11000 },
  { title: '25K Mile 2006 Porsche 911 Turbo', expected: 25000 },
  { title: '1,234-Mile 2022 Porsche 911 GT3', expected: 1234 },
  { title: '45,678-Mile 2010 Porsche Cayman', expected: 45678 },
];

console.log('\n✅ Test 2 - Various mileage formats');
for (const { title, expected } of testCases) {
  const html = `<html><body><h1 class="listing-title">${title}</h1></body></html>`;
  const $ = cheerio.load(html);
  const mileage = (scraper as any).extractMileage($);
  console.log(`   "${title}"`);
  console.log(`   Expected: ${expected}, Got: ${mileage}`);
  console.log(`   Result: ${mileage === expected ? '✅ PASS' : '❌ FAIL'}`);
}

// Test Case 3: Actual problematic HTML (simplified)
const problematicHtml = `
  <html>
    <body>
      <h1 class="listing-title">8k-Mile 2004 Porsche 911 GT3</h1>
      <div class="listing-description">
        This GT3 was purchased by the current owner in 2018 and now has 8k miles.
      </div>
      <div class="sidebar">
        <div>Similar listing: 11k-Mile GT3 sold for $180k</div>
        <div>Another GT3 with 175k miles sold for $90k</div>
      </div>
    </body>
  </html>
`;

const $prob = cheerio.load(problematicHtml);
const mileageProb = (scraper as any).extractMileage($prob);
console.log('\n✅ Test 3 - Problematic case with multiple mileage references');
console.log('   Expected: 8000 (from title), Got:', mileageProb);
console.log('   Result:', mileageProb === 8000 ? '✅ PASS' : '❌ FAIL');

// Test Case 4: Structured data
const structuredHtml = `
  <html>
    <body>
      <h1 class="listing-title">2004 Porsche 911 GT3</h1>
      <dl class="essentials">
        <dt>Mileage</dt>
        <dd>8,456</dd>
      </dl>
    </body>
  </html>
`;

const $struct = cheerio.load(structuredHtml);
const mileageStruct = (scraper as any).extractMileage($struct);
console.log('\n✅ Test 4 - Structured mileage data');
console.log('   Expected: 8456, Got:', mileageStruct);
console.log('   Result:', mileageStruct === 8456 ? '✅ PASS' : '❌ FAIL');

console.log('\n' + '═'.repeat(50));
console.log('All tests completed!');