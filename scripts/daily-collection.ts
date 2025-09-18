#!/usr/bin/env node

/**
 * Daily collection job for scraping all sources
 * Run this via cron job or scheduled task
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

interface ScraperJob {
  source: string;
  maxPages: number;
  description: string;
}

const SCRAPER_JOBS: ScraperJob[] = [
  { source: 'bat', maxPages: 5, description: 'Bring a Trailer (sold auctions)' },
  { source: 'carsandbids', maxPages: 5, description: 'Cars and Bids (past auctions)' },
  { source: 'classic', maxPages: 3, description: 'Classic.com (sold listings)' },
  { source: 'edmunds', maxPages: 2, description: 'Edmunds (current inventory)' },
  { source: 'cargurus', maxPages: 2, description: 'CarGurus (current inventory)' },
  { source: 'autotrader', maxPages: 2, description: 'Autotrader (current inventory)' }
];

async function runScraper(job: ScraperJob) {
  console.log(`\n📊 Starting ${job.description}...`);
  
  try {
    const response = await axios.post(
      `${API_URL}/api/scrape`,
      {
        source: job.source,
        maxPages: job.maxPages,
        normalize: true
      },
      {
        headers: {
          'Authorization': `Bearer ${SCRAPER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 300000 // 5 minute timeout
      }
    );
    
    const { count, source } = response.data;
    console.log(`✅ ${job.description}: Scraped ${count} listings`);
    return { source, count, success: true };
  } catch (error: any) {
    console.error(`❌ ${job.description} failed:`, error.response?.data || error.message);
    return { source: job.source, count: 0, success: false, error: error.message };
  }
}

async function runAllScrapers() {
  console.log('========================================');
  console.log('    PorscheStats Daily Collection');
  console.log('========================================');
  console.log(`Started at: ${new Date().toISOString()}`);
  
  if (!SCRAPER_API_KEY) {
    console.error('❌ SCRAPER_API_KEY not configured!');
    process.exit(1);
  }
  
  // Option 1: Run all scrapers in parallel (faster but more resource intensive)
  // const results = await Promise.allSettled(
  //   SCRAPER_JOBS.map(job => runScraper(job))
  // );
  
  // Option 2: Run scrapers sequentially (slower but more stable)
  const results = [];
  for (const job of SCRAPER_JOBS) {
    const result = await runScraper(job);
    results.push(result);
    
    // Wait between scrapers to avoid overwhelming the system
    if (job !== SCRAPER_JOBS[SCRAPER_JOBS.length - 1]) {
      console.log('⏳ Waiting 10 seconds before next scraper...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  // Summary
  console.log('\n========================================');
  console.log('             Summary');
  console.log('========================================');
  
  let totalListings = 0;
  let successfulScrapers = 0;
  
  for (const result of results) {
    if ('value' in result) {
      // Promise.allSettled result
      const { source, count, success } = result.value as any;
      if (success) {
        totalListings += count;
        successfulScrapers++;
        console.log(`✅ ${source}: ${count} listings`);
      } else {
        console.log(`❌ ${source}: Failed`);
      }
    } else {
      // Direct result
      const { source, count, success } = result as any;
      if (success) {
        totalListings += count;
        successfulScrapers++;
        console.log(`✅ ${source}: ${count} listings`);
      } else {
        console.log(`❌ ${source}: Failed`);
      }
    }
  }
  
  console.log('\n----------------------------------------');
  console.log(`Total listings scraped: ${totalListings}`);
  console.log(`Successful scrapers: ${successfulScrapers}/${SCRAPER_JOBS.length}`);
  console.log(`Completed at: ${new Date().toISOString()}`);
  console.log('========================================');
  
  // Exit with appropriate code
  process.exit(successfulScrapers === SCRAPER_JOBS.length ? 0 : 1);
}

// Alternative: Use the 'all' endpoint for parallel execution
async function runAllScrapersParallel() {
  console.log('========================================');
  console.log('    PorscheStats Daily Collection');
  console.log('========================================');
  console.log(`Started at: ${new Date().toISOString()}`);
  
  if (!SCRAPER_API_KEY) {
    console.error('❌ SCRAPER_API_KEY not configured!');
    process.exit(1);
  }
  
  console.log('📊 Running all scrapers in parallel...');
  
  try {
    const response = await axios.post(
      `${API_URL}/api/scrape`,
      {
        source: 'all',
        maxPages: 3,
        normalize: true
      },
      {
        headers: {
          'Authorization': `Bearer ${SCRAPER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 600000 // 10 minute timeout
      }
    );
    
    const { count, results } = response.data;
    console.log(`✅ Successfully scraped ${count} total listings`);
    
    console.log(`\nCompleted at: ${new Date().toISOString()}`);
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Collection failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run based on command line argument
const mode = process.argv[2];
if (mode === '--parallel') {
  runAllScrapersParallel().catch(console.error);
} else {
  runAllScrapers().catch(console.error);
}