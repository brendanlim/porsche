import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BaTScraperPuppeteer } from '../lib/scrapers/bat-puppeteer';

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('SCRAPING GT4 RS LISTINGS FROM BAT');
  console.log('='.repeat(80) + '\n');
  
  const batScraper = new BaTScraperPuppeteer();
  
  try {
    // Scrape GT4 RS specifically
    console.log('Scraping 718 Cayman GT4 RS from BaT...');
    const results = await batScraper.scrapeListings({
      model: '718-cayman',
      trim: 'gt4-rs',
      maxPages: 1  // BaT uses dynamic loading, not pagination
    });
    
    console.log(`\n✅ Found ${results.length} GT4 RS listings`);
    
    if (results.length > 0) {
      // Save to database
      console.log('Saving listings to database...');
      for (const listing of results) {
        await batScraper.saveListing(listing);
      }
      console.log('✅ Saved all listings to database');
      
      // Show sample
      console.log('\nSample listings:');
      results.slice(0, 3).forEach(l => {
        console.log(`  - ${l.year || 'N/A'} ${l.model} ${l.trim}`);
        console.log(`    Price: $${l.price?.toLocaleString() || 'N/A'}, Mileage: ${l.mileage?.toLocaleString() || 'N/A'}`);
        console.log(`    Color: ${l.exterior_color || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main().catch(console.error);