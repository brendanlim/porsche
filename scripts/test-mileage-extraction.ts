import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BaTScraper } from '../lib/scrapers/bat';

async function testMileageExtraction() {
  console.log('🔍 Testing mileage extraction from BaT detail pages...\n');
  
  const scraper = new BaTScraper();
  
  // Test with a specific GT3 listing URL
  const testUrls = [
    'https://bringatrailer.com/listing/2014-porsche-911-gt3-36/',
    'https://bringatrailer.com/listing/2018-porsche-911-gt3-touring-6-speed-5/',
    'https://bringatrailer.com/listing/2015-porsche-911-gt3-42/'
  ];
  
  for (const url of testUrls) {
    console.log(`\nTesting: ${url}`);
    console.log('-'.repeat(60));
    
    try {
      // Use the scraper's scrapeDetail method
      const detail = await (scraper as any).scrapeDetail(url);
      
      if (detail) {
        console.log(`✅ Title: ${detail.title}`);
        console.log(`   Model: ${detail.model}`);
        console.log(`   Trim: ${detail.trim}`);
        console.log(`   Year: ${detail.year}`);
        console.log(`   Price: $${detail.price?.toLocaleString()}`);
        console.log(`   Mileage: ${detail.mileage ? detail.mileage.toLocaleString() + ' miles' : 'NOT FOUND'}`);
        console.log(`   Status: ${detail.status}`);
        
        if (!detail.mileage) {
          console.log('   ⚠️ WARNING: Mileage was not extracted!');
        }
      } else {
        console.log('❌ Failed to scrape detail page');
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Mileage extraction test complete');
}

testMileageExtraction().catch(console.error);