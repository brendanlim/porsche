#!/usr/bin/env npx tsx

/**
 * Test if deduplication is actually working
 */

async function testDedup() {
  console.log('🧪 TESTING DEDUPLICATION\n');
  console.log('This test will scrape BaT with multiple trims that use the same URL');
  console.log('We should see "Already fetched" messages for duplicate URLs\n');

  // Load env
  const path = await import('path');
  const fs = await import('fs');
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const dotenv = await import('dotenv');
    dotenv.config({ path: envPath });
  }

  // Import the BaT scraper
  const { BaTScraperPuppeteer } = await import('../../lib/scrapers/bat-puppeteer');

  console.log('Starting test with 991 generation (has 6 trims with same URL)...\n');

  const scraper = new BaTScraperPuppeteer(false); // Use regular scraper

  // This should fetch the 991-911 URL only ONCE, not 6 times
  const results = await scraper.scrapeListings({
    model: '911',
    maxPages: 1,
    onlySold: true
  });

  console.log(`\n✅ Test complete!`);
  console.log(`  Listings found: ${results.length}`);

  console.log('\n📋 Look for these indicators of success:');
  console.log('  ✅ "Already fetched this URL in this session" messages');
  console.log('  ✅ "Saved ~$0.012 by not re-fetching" messages');
  console.log('  ✅ Multiple trims processed but only 1 actual fetch per unique URL');

  console.log('\n💰 Expected savings:');
  console.log('  Without dedup: 78 model configs = 78 fetches');
  console.log('  With dedup: ~20 unique URLs = 20 fetches');
  console.log('  Savings: 58 fetches × $0.012 = $0.70 per run');
  console.log('  Monthly: $0.70 × 30 days × 24 runs = ~$500/month saved');
}

testDedup().catch(console.error);