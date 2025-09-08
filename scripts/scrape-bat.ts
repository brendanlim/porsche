// Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Now import modules that depend on env vars
import { BaTScraper } from '../lib/scrapers/bat';

async function main() {
  console.log('Starting BaT scraper - SOLD LISTINGS ONLY');
  console.log('This will fetch hundreds of sold Porsche listings from Bring a Trailer');
  console.log('Including special models: 911 S/T, 911 Sport Classic, and more\n');
  
  const scraper = new BaTScraper();
  
  try {
    console.log('Fetching sold listings from BaT...');
    const results = await scraper.scrapeListings({
      maxPages: 10, // Fetch up to 10 pages per model
      onlySold: true // Ensure we only get sold listings
    });
    
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

main();