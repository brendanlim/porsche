import { BaTScraper } from '../../lib/scrapers/bat';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const testUrl = 'https://bringatrailer.com/listing/2004-porsche-911-gt3-64/';

async function verifyFix() {
  console.log('🔍 Verifying the mileage fix on actual URL...');
  console.log('URL:', testUrl);
  console.log('─'.repeat(70));

  try {
    const scraper = new BaTScraper();

    console.log('\n1️⃣ Running scraper.scrapeDetail()...');
    const result = await scraper.scrapeDetail(testUrl, '911', 'gt3');

    if (result) {
      console.log('\n✅ Scraper returned a result:');
      console.log('   • Title:', result.title);
      console.log('   • Mileage:', result.mileage);
      console.log('   • VIN:', result.vin);
      console.log('   • Price:', result.price);
      console.log('   • Year:', result.year);

      console.log('\n📊 Validation:');
      if (result.mileage === 8000) {
        console.log('   ✅ Mileage is CORRECT (8,000 miles)');
      } else if (result.mileage === 186000) {
        console.log('   ❌ ERROR: Still getting wrong mileage (186,000)');
      } else {
        console.log('   ⚠️  Unexpected mileage value:', result.mileage);
      }
    } else {
      console.log('❌ No result from scraper (might not be a sold listing)');
    }
  } catch (error) {
    console.error('❌ Error during scraping:', error);
    if (error instanceof Error) {
      console.error('   Stack:', error.stack);
    }
  }
}

verifyFix().catch(console.error);