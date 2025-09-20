import { BaTScraper } from '../../lib/scrapers/bat';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Test a few different listing URLs to make sure we didn't break anything
const testUrls = [
  {
    url: 'https://bringatrailer.com/listing/2016-porsche-911-gt3-rs-31/',
    expectedMileage: { min: 1000, max: 30000 }, // We don't know exact, but should be reasonable
    description: '2016 911 GT3 RS'
  },
  {
    url: 'https://bringatrailer.com/listing/2022-porsche-718-cayman-gt4-rs-3/',
    expectedMileage: { min: 100, max: 10000 },
    description: '2022 718 Cayman GT4 RS'
  }
];

async function testOtherListings() {
  console.log('🔍 Testing other listings to ensure no regression...');
  console.log('═'.repeat(70));

  const scraper = new BaTScraper();

  for (const test of testUrls) {
    console.log(`\n📋 Testing: ${test.description}`);
    console.log(`   URL: ${test.url}`);

    try {
      const result = await scraper.scrapeDetail(test.url);

      if (result) {
        console.log('   Result:');
        console.log(`     • Title: ${result.title}`);
        console.log(`     • Mileage: ${result.mileage}`);
        console.log(`     • Price: ${result.price}`);

        if (result.mileage) {
          if (result.mileage >= test.expectedMileage.min && result.mileage <= test.expectedMileage.max) {
            console.log(`     ✅ Mileage looks reasonable (${result.mileage} is within expected range)`);
          } else {
            console.log(`     ⚠️ Mileage might be wrong (${result.mileage} is outside expected ${test.expectedMileage.min}-${test.expectedMileage.max})`);
          }
        } else {
          console.log('     ⚠️ No mileage extracted');
        }
      } else {
        console.log('   ℹ️ No result (might not be a sold listing)');
      }
    } catch (error) {
      console.log('   ❌ Error:', error instanceof Error ? error.message : error);
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('Testing complete!');
}

testOtherListings().catch(console.error);