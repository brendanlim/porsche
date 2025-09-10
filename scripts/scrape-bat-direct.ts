// Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Now import modules that depend on env vars
import { BaTScraper } from '../lib/scrapers/bat';

// Known SOLD BaT listings - these are confirmed sold, not active auctions
const SOLD_BAT_LISTINGS = [
  // GT4 RS listings
  'https://bringatrailer.com/listing/2022-porsche-718-cayman-gt4-rs-2/',
  'https://bringatrailer.com/listing/2022-porsche-718-cayman-gt4-rs-3/',
  'https://bringatrailer.com/listing/2023-porsche-718-cayman-gt4-rs/',
  
  // GT3 RS listings
  'https://bringatrailer.com/listing/2023-porsche-911-gt3-rs-3/',
  'https://bringatrailer.com/listing/2023-porsche-911-gt3-rs-2/',
  'https://bringatrailer.com/listing/2019-porsche-911-gt3-rs-14/',
  'https://bringatrailer.com/listing/2019-porsche-911-gt3-rs-15/',
  'https://bringatrailer.com/listing/2016-porsche-911-gt3-rs-29/',
  
  // GT3 listings
  'https://bringatrailer.com/listing/2022-porsche-911-gt3-22/',
  'https://bringatrailer.com/listing/2022-porsche-911-gt3-21/',
  'https://bringatrailer.com/listing/2022-porsche-911-gt3-20/',
  'https://bringatrailer.com/listing/2018-porsche-911-gt3-41/',
  'https://bringatrailer.com/listing/2018-porsche-911-gt3-40/',
  
  // 911 Turbo S
  'https://bringatrailer.com/listing/2021-porsche-911-turbo-s-13/',
  'https://bringatrailer.com/listing/2021-porsche-911-turbo-s-12/',
  'https://bringatrailer.com/listing/2022-porsche-911-turbo-s-5/',
  
  // 911 Sport Classic
  'https://bringatrailer.com/listing/2023-porsche-911-sport-classic/',
  
  // 718 Spyder
  'https://bringatrailer.com/listing/2022-porsche-718-spyder-3/',
  'https://bringatrailer.com/listing/2020-porsche-718-spyder-9/',
  
  // 718 Cayman GTS
  'https://bringatrailer.com/listing/2022-porsche-718-cayman-gts-4-0-2/',
  'https://bringatrailer.com/listing/2021-porsche-718-cayman-gts-4-0-8/',
  
  // 911 Carrera S
  'https://bringatrailer.com/listing/2020-porsche-911-carrera-s-29/',
  'https://bringatrailer.com/listing/2020-porsche-911-carrera-s-28/',
  'https://bringatrailer.com/listing/2022-porsche-911-carrera-s-3/',
  
  // 911 Targa
  'https://bringatrailer.com/listing/2021-porsche-911-targa-4s-6/',
  'https://bringatrailer.com/listing/2021-porsche-911-targa-4s-5/',
  
  // Add more GT models
  'https://bringatrailer.com/listing/2023-porsche-718-cayman-gt4-rs-2/',
  'https://bringatrailer.com/listing/2022-porsche-718-cayman-gt4-10/',
  'https://bringatrailer.com/listing/2021-porsche-718-cayman-gt4-16/',
  'https://bringatrailer.com/listing/2020-porsche-718-cayman-gt4-21/',
  
  // More 911 GT3
  'https://bringatrailer.com/listing/2023-porsche-911-gt3-7/',
  'https://bringatrailer.com/listing/2023-porsche-911-gt3-6/',
  'https://bringatrailer.com/listing/2022-porsche-911-gt3-touring-4/',
  'https://bringatrailer.com/listing/2022-porsche-911-gt3-touring-3/',
  
  // 911 GTS
  'https://bringatrailer.com/listing/2022-porsche-911-gts-3/',
  'https://bringatrailer.com/listing/2022-porsche-911-gts-2/',
  'https://bringatrailer.com/listing/2022-porsche-911-carrera-gts/',
  
  // Classic 911s
  'https://bringatrailer.com/listing/1973-porsche-911-carrera-rs-touring-2/',
  'https://bringatrailer.com/listing/1989-porsche-911-turbo-73/',
  'https://bringatrailer.com/listing/1987-porsche-911-turbo-88/',
  'https://bringatrailer.com/listing/1996-porsche-911-turbo-54/',
  'https://bringatrailer.com/listing/1997-porsche-911-turbo-49/',
];

async function main() {
  console.log('Starting direct BaT scraper - KNOWN SOLD LISTINGS ONLY');
  console.log(`Fetching ${SOLD_BAT_LISTINGS.length} confirmed sold Porsche listings from Bring a Trailer\n`);
  
  const scraper = new BaTScraper();
  const results: any[] = [];
  
  try {
    await scraper.startIngestion();
    
    for (let i = 0; i < SOLD_BAT_LISTINGS.length; i++) {
      const url = SOLD_BAT_LISTINGS[i];
      console.log(`[${i + 1}/${SOLD_BAT_LISTINGS.length}] Scraping: ${url}`);
      
      try {
        const detail = await scraper.scrapeDetail(url);
        
        if (detail) {
          // Only save if it's confirmed sold
          if (detail.status === 'sold' && detail.price && detail.price > 15000) {
            results.push(detail);
            await scraper.saveListing({
              ...detail,
              status: 'sold'
            });
            console.log(`  ✅ Saved: ${detail.title} - $${detail.price?.toLocaleString()}`);
          } else if (detail.status === 'active') {
            console.log(`  ⚠️ SKIPPED (Active Auction): ${detail.title}`);
          } else {
            console.log(`  ⚠️ SKIPPED (Invalid): ${detail.title} - Status: ${detail.status}, Price: $${detail.price}`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Failed to scrape ${url}:`, error);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    await scraper.completeIngestion();
    
    console.log(`\n✅ Successfully scraped ${results.length} SOLD listings from BaT`);
    
    // Show summary by model
    const modelCounts: Record<string, number> = {};
    const priceSummary: Record<string, { min: number; max: number; avg: number; count: number }> = {};
    
    results.forEach(listing => {
      const model = listing.model || 'Unknown';
      modelCounts[model] = (modelCounts[model] || 0) + 1;
      
      if (listing.price) {
        if (!priceSummary[model]) {
          priceSummary[model] = { min: listing.price, max: listing.price, avg: listing.price, count: 1 };
        } else {
          priceSummary[model].min = Math.min(priceSummary[model].min, listing.price);
          priceSummary[model].max = Math.max(priceSummary[model].max, listing.price);
          priceSummary[model].avg = (priceSummary[model].avg * priceSummary[model].count + listing.price) / (priceSummary[model].count + 1);
          priceSummary[model].count++;
        }
      }
    });
    
    console.log('\n📊 Summary by Model:');
    Object.entries(modelCounts).sort((a, b) => b[1] - a[1]).forEach(([model, count]) => {
      const price = priceSummary[model];
      if (price) {
        console.log(`  ${model}: ${count} listings ($${Math.round(price.min).toLocaleString()} - $${Math.round(price.max).toLocaleString()}, avg: $${Math.round(price.avg).toLocaleString()})`);
      } else {
        console.log(`  ${model}: ${count} listings`);
      }
    });
    
  } catch (error) {
    console.error('Failed to scrape BaT:', error);
    process.exit(1);
  }
}

// Add type declaration for the scraper methods we're using
declare module '../lib/scrapers/bat' {
  interface BaTScraper {
    startIngestion(): Promise<string>;
    scrapeDetail(url: string): Promise<any>;
    saveListing(listing: any): Promise<string | null>;
    completeIngestion(status?: 'completed' | 'failed'): Promise<void>;
  }
}

main();