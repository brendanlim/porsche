#!/usr/bin/env npx tsx
/**
 * Debug script to investigate the HTML caching vs database saving disconnect
 *
 * The issue: 126 HTML entries cached but 0 listings saved to database
 * This script will help identify where the flow is breaking
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
async function loadEnvironmentVariables() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    try {
      const dotenv = await import('dotenv');
      dotenv.config({ path: envPath });
      console.log('✅ Loaded environment variables from .env.local');
    } catch (error) {
      console.log('Using environment variables from system');
    }
  } else {
    console.log('Using environment variables from system/GitHub Actions');
  }
}

async function main() {
  await loadEnvironmentVariables();

  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  console.log('🔍 INVESTIGATING SCRAPER DISCONNECT ISSUE');
  console.log('━'.repeat(80));

  // Check raw_html_cache entries from recent runs
  console.log('\n📂 CHECKING HTML CACHE ENTRIES:');
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  console.log(`Searching for entries from ${yesterday} and ${today}...`);

  const { data: htmlCacheEntries, error: htmlError } = await supabase
    .from('raw_html_cache')
    .select('*')
    .or(`scraped_at.gte.${yesterday}T00:00:00.000Z,scraped_at.gte.${today}T00:00:00.000Z`)
    .order('scraped_at', { ascending: false });

  if (htmlError) {
    console.error('❌ Error fetching HTML cache:', htmlError);
  } else {
    console.log(`📊 Found ${htmlCacheEntries?.length || 0} HTML cache entries`);

    if (htmlCacheEntries && htmlCacheEntries.length > 0) {
      // Group by source
      const sourceBreakdown: Record<string, number> = {};
      const typeBreakdown: Record<string, number> = {};

      htmlCacheEntries.forEach(entry => {
        sourceBreakdown[entry.source] = (sourceBreakdown[entry.source] || 0) + 1;
        // Extract type from URL or metadata
        const path = entry.storage_path || '';
        if (path.includes('/search/')) typeBreakdown['search'] = (typeBreakdown['search'] || 0) + 1;
        else if (path.includes('/detail/')) typeBreakdown['detail'] = (typeBreakdown['detail'] || 0) + 1;
        else if (path.includes('/listing/')) typeBreakdown['listing'] = (typeBreakdown['listing'] || 0) + 1;
        else typeBreakdown['unknown'] = (typeBreakdown['unknown'] || 0) + 1;
      });

      console.log('\nBreakdown by source:');
      Object.entries(sourceBreakdown).forEach(([source, count]) => {
        console.log(`  • ${source}: ${count} entries`);
      });

      console.log('\nBreakdown by type:');
      Object.entries(typeBreakdown).forEach(([type, count]) => {
        console.log(`  • ${type}: ${count} entries`);
      });

      // Show recent entries
      console.log('\nMost recent entries:');
      htmlCacheEntries.slice(0, 5).forEach((entry, i) => {
        const size = entry.file_size ? `${Math.round(entry.file_size / 1024)}KB` : 'unknown size';
        const time = new Date(entry.scraped_at).toLocaleString();
        console.log(`  ${i + 1}. ${entry.source} | ${size} | ${time}`);
        console.log(`     ${entry.url}`);
      });
    }
  }

  // Check listings table for recent entries
  console.log('\n📋 CHECKING LISTINGS TABLE:');
  const { data: recentListings, error: listingsError } = await supabase
    .from('listings')
    .select('*')
    .or(`scraped_at.gte.${yesterday}T00:00:00.000Z,scraped_at.gte.${today}T00:00:00.000Z`)
    .order('scraped_at', { ascending: false });

  if (listingsError) {
    console.error('❌ Error fetching listings:', listingsError);
  } else {
    console.log(`📊 Found ${recentListings?.length || 0} listings scraped recently`);

    if (recentListings && recentListings.length > 0) {
      // Group by source
      const sourceBreakdown: Record<string, number> = {};
      recentListings.forEach(listing => {
        sourceBreakdown[listing.source] = (sourceBreakdown[listing.source] || 0) + 1;
      });

      console.log('\nBreakdown by source:');
      Object.entries(sourceBreakdown).forEach(([source, count]) => {
        console.log(`  • ${source}: ${count} listings`);
      });

      // Show recent listings
      console.log('\nMost recent listings:');
      recentListings.slice(0, 5).forEach((listing, i) => {
        const time = new Date(listing.scraped_at).toLocaleString();
        const model = listing.model || 'Unknown';
        const price = listing.price ? `$${listing.price.toLocaleString()}` : 'No price';
        console.log(`  ${i + 1}. ${listing.source} | ${model} | ${price} | ${time}`);
        console.log(`     ${listing.title?.substring(0, 60)}...`);
      });
    } else {
      console.log('⚠️  NO RECENT LISTINGS FOUND - This confirms the issue!');
    }
  }

  // Check ingestion_runs table for failed runs
  console.log('\n📊 CHECKING INGESTION RUNS:');
  const { data: ingestionRuns, error: runsError } = await supabase
    .from('ingestion_runs')
    .select('*')
    .or(`started_at.gte.${yesterday}T00:00:00.000Z,started_at.gte.${today}T00:00:00.000Z`)
    .order('started_at', { ascending: false });

  if (runsError) {
    console.error('❌ Error fetching ingestion runs:', runsError);
  } else {
    console.log(`📊 Found ${ingestionRuns?.length || 0} ingestion runs`);

    if (ingestionRuns && ingestionRuns.length > 0) {
      ingestionRuns.forEach((run, i) => {
        const time = new Date(run.started_at).toLocaleString();
        const status = run.status || 'unknown';
        const duration = run.completed_at
          ? Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)
          : 'ongoing';
        console.log(`  ${i + 1}. ${run.source} | ${status} | ${duration}s | ${time}`);
        if (run.error_details) {
          console.log(`     ERROR: ${JSON.stringify(run.error_details)}`);
        }
        if (run.total_scraped && run.total_saved) {
          console.log(`     Scraped: ${run.total_scraped}, Saved: ${run.total_saved}`);
        }
      });
    } else {
      console.log('❌ No ingestion runs found - scraper might not be tracking runs properly');
    }
  }

  // Analysis
  console.log('\n🔍 ANALYSIS:');
  console.log('━'.repeat(60));

  const htmlCount = htmlCacheEntries?.length || 0;
  const listingsCount = recentListings?.length || 0;

  if (htmlCount > 0 && listingsCount === 0) {
    console.log('🚨 CONFIRMED: HTML is being cached but NO listings are being saved!');
    console.log('\nPossible causes:');
    console.log('  1. Error in saveListings() function that\'s being swallowed');
    console.log('  2. Scraper throwing error AFTER HTML storage but BEFORE returning listings');
    console.log('  3. Main scraper not awaiting saveListings properly');
    console.log('  4. Database connection issues during save (but not during HTML cache)');
    console.log('  5. Timeout occurring between HTML storage and database save');

    // Check for specific error patterns
    if (ingestionRuns && ingestionRuns.length > 0) {
      const failedRuns = ingestionRuns.filter(r => r.status === 'failed');
      if (failedRuns.length > 0) {
        console.log('\n❌ Found failed ingestion runs - this might be the issue!');
      }
    }
  } else if (htmlCount > 0 && listingsCount > 0) {
    console.log('✅ Both HTML and listings are being saved - issue might be intermittent');
  } else if (htmlCount === 0 && listingsCount === 0) {
    console.log('❓ Neither HTML nor listings found - scraper might not have run recently');
  }

  console.log('\n💡 NEXT STEPS:');
  console.log('━'.repeat(60));
  console.log('1. Run a test scrape with a single source and watch for errors');
  console.log('2. Add more detailed error logging in saveListings() function');
  console.log('3. Check if the scraper is timing out before completing saves');
  console.log('4. Review GitHub Actions workflow logs for specific error messages');

  console.log('\nTo test manually, run:');
  console.log('  npx tsx scripts/scraping/scrape-and-save.ts --source=bat --max-pages=1');
}

main().catch((error) => {
  console.error('❌ FATAL ERROR:', error);
  process.exit(1);
});