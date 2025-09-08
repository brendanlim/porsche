#!/usr/bin/env node

// Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BaTScraper } from '../lib/scrapers/bat';

// Define comprehensive scraping strategy
const SCRAPING_STRATEGY = {
  // Start with high-value GT models
  highPriority: [
    { model: '911', trims: ['GT3 RS', 'GT3', 'GT2 RS', 'S/T', 'Sport Classic'] },
    { model: '718', trims: ['Cayman GT4 RS', 'Cayman GT4', 'Spyder RS'] }
  ],
  // Then Turbo models
  mediumPriority: [
    { model: '911', trims: ['Turbo S', 'Turbo'] }
  ],
  // Then GTS and regular models
  lowPriority: [
    { model: '911', trims: ['GTS', 'Carrera S', 'Carrera', 'Targa'] },
    { model: '718', trims: ['Cayman GTS 4.0', 'Boxster GTS 4.0', 'Cayman S', 'Boxster S'] }
  ]
};

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('COMPREHENSIVE BRING A TRAILER SCRAPER');
  console.log('='.repeat(80));
  console.log('Golden Rule: Storage is cheap, scraping is not');
  console.log('Strategy: Fetch ALL models, ALL trims, with proper pagination');
  console.log('Organization: source/model/trim/date/type/');
  console.log('='.repeat(80) + '\n');

  const scraper = new BaTScraper();
  let totalScraped = 0;
  let totalProcessed = 0;

  // Process high priority models first (GT models)
  console.log('\nPHASE 1: HIGH PRIORITY - GT MODELS');
  console.log('-'.repeat(40));
  for (const config of SCRAPING_STRATEGY.highPriority) {
    console.log(`\nScraping ${config.model} - High Value Trims:`);
    console.log(`  Trims: ${config.trims.join(', ')}`);
    
    try {
      const results = await scraper.scrapeListings({
        models: [config.model],
        maxPages: 10  // More pages for high-value models
      });
      
      totalScraped += results.length;
      console.log(`  ✓ Scraped ${results.length} listings for ${config.model} high-value trims`);
    } catch (error) {
      console.error(`  ✗ Error scraping ${config.model}:`, error);
    }
  }

  // Process medium priority (Turbo models)
  console.log('\n\nPHASE 2: MEDIUM PRIORITY - TURBO MODELS');
  console.log('-'.repeat(40));
  for (const config of SCRAPING_STRATEGY.mediumPriority) {
    console.log(`\nScraping ${config.model} - Turbo Models:`);
    console.log(`  Trims: ${config.trims.join(', ')}`);
    
    try {
      const results = await scraper.scrapeListings({
        models: [config.model],
        maxPages: 7
      });
      
      totalScraped += results.length;
      console.log(`  ✓ Scraped ${results.length} listings for ${config.model} Turbo models`);
    } catch (error) {
      console.error(`  ✗ Error scraping ${config.model}:`, error);
    }
  }

  // Process low priority (Regular models)
  console.log('\n\nPHASE 3: LOW PRIORITY - REGULAR MODELS');
  console.log('-'.repeat(40));
  for (const config of SCRAPING_STRATEGY.lowPriority) {
    console.log(`\nScraping ${config.model} - Regular Models:`);
    console.log(`  Trims: ${config.trims.join(', ')}`);
    
    try {
      const results = await scraper.scrapeListings({
        models: [config.model],
        maxPages: 5
      });
      
      totalScraped += results.length;
      console.log(`  ✓ Scraped ${results.length} listings for ${config.model} regular models`);
    } catch (error) {
      console.error(`  ✗ Error scraping ${config.model}:`, error);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('SCRAPING COMPLETE');
  console.log('='.repeat(80));
  console.log(`Total Listings Scraped: ${totalScraped}`);
  console.log(`Total SOLD Listings Saved: ${totalProcessed}`);
  console.log('\nData Organization:');
  console.log('  - All HTML stored in Supabase Storage');
  console.log('  - Organized by: source/model/trim/date/type/');
  console.log('  - Search pages and detail pages stored separately');
  console.log('  - Only SOLD listings saved to database');
  console.log('='.repeat(80) + '\n');

  process.exit(0);
}

// Run the scraper
main().catch(error => {
  console.error('\n\nFATAL ERROR:', error);
  process.exit(1);
});