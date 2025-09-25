#!/usr/bin/env npx tsx
/**
 * Check for recent workflow runs and identify potential issues
 * Focus on runs that might have had the HTML cache vs listings disconnect
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
  }
}

async function main() {
  await loadEnvironmentVariables();

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

  console.log('🔍 CHECKING FOR PROBLEMATIC RUNS');
  console.log('━'.repeat(80));

  // Get all HTML cache entries from the last 48 hours, grouped by hour
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  console.log('\n📂 HTML CACHE ENTRIES BY HOUR:');
  const { data: htmlEntries } = await supabase
    .from('raw_html_cache')
    .select('scraped_at, source')
    .gte('scraped_at', twoDaysAgo)
    .order('scraped_at', { ascending: false });

  if (htmlEntries) {
    const hourGroups: Record<string, Record<string, number>> = {};

    htmlEntries.forEach(entry => {
      const hour = entry.scraped_at.substring(0, 13); // YYYY-MM-DDTHH
      if (!hourGroups[hour]) hourGroups[hour] = {};
      hourGroups[hour][entry.source] = (hourGroups[hour][entry.source] || 0) + 1;
    });

    Object.entries(hourGroups)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 20)
      .forEach(([hour, sources]) => {
        const time = new Date(hour + ':00:00Z').toLocaleString();
        const total = Object.values(sources).reduce((sum, count) => sum + count, 0);
        console.log(`${time}: ${total} entries`);
        Object.entries(sources).forEach(([source, count]) => {
          console.log(`  • ${source}: ${count}`);
        });
      });
  }

  // Get all listings from the last 48 hours, grouped by hour
  console.log('\n📋 LISTINGS SAVED BY HOUR:');
  const { data: listings } = await supabase
    .from('listings')
    .select('scraped_at, source')
    .gte('scraped_at', twoDaysAgo)
    .order('scraped_at', { ascending: false });

  if (listings) {
    const hourGroups: Record<string, Record<string, number>> = {};

    listings.forEach(listing => {
      const hour = listing.scraped_at.substring(0, 13); // YYYY-MM-DDTHH
      if (!hourGroups[hour]) hourGroups[hour] = {};
      hourGroups[hour][listing.source] = (hourGroups[hour][listing.source] || 0) + 1;
    });

    Object.entries(hourGroups)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 20)
      .forEach(([hour, sources]) => {
        const time = new Date(hour + ':00:00Z').toLocaleString();
        const total = Object.values(sources).reduce((sum, count) => sum + count, 0);
        console.log(`${time}: ${total} listings`);
        Object.entries(sources).forEach(([source, count]) => {
          console.log(`  • ${source}: ${count}`);
        });
      });
  }

  // Look for potential problem patterns
  console.log('\n🚨 LOOKING FOR DISCONNECT PATTERNS:');

  if (htmlEntries && listings) {
    // Create maps by time period (30-minute windows)
    const htmlByPeriod: Record<string, number> = {};
    const listingsByPeriod: Record<string, number> = {};

    htmlEntries.forEach(entry => {
      const period = entry.scraped_at.substring(0, 15); // YYYY-MM-DDTHH:M (30-min groups)
      const periodKey = Math.floor(parseInt(period.slice(-1)) / 3) * 3; // Round to 30-min
      const key = period.slice(0, -1) + periodKey;
      htmlByPeriod[key] = (htmlByPeriod[key] || 0) + 1;
    });

    listings.forEach(listing => {
      const period = listing.scraped_at.substring(0, 15);
      const periodKey = Math.floor(parseInt(period.slice(-1)) / 3) * 3;
      const key = period.slice(0, -1) + periodKey;
      listingsByPeriod[key] = (listingsByPeriod[key] || 0) + 1;
    });

    // Find periods where HTML was cached but few/no listings saved
    const suspiciousPeriods = Object.keys(htmlByPeriod).filter(period => {
      const htmlCount = htmlByPeriod[period] || 0;
      const listingsCount = listingsByPeriod[period] || 0;

      // Flag if we have significant HTML (>50) but no or very few listings
      return htmlCount > 50 && (listingsCount === 0 || listingsCount < htmlCount * 0.1);
    });

    if (suspiciousPeriods.length > 0) {
      console.log('\n⚠️  FOUND SUSPICIOUS PERIODS:');
      suspiciousPeriods.forEach(period => {
        const htmlCount = htmlByPeriod[period];
        const listingsCount = listingsByPeriod[period] || 0;
        const time = new Date(period.replace(/(\d)$/, '$10:00Z')).toLocaleString();
        console.log(`${time}: ${htmlCount} HTML cached, ${listingsCount} listings saved`);
      });

      // This might be the issue the user reported!
      if (suspiciousPeriods.some(p => htmlByPeriod[p] >= 100)) {
        console.log('\n🚨 LIKELY FOUND THE ISSUE:');
        console.log('   Large HTML caching with minimal listing saves detected!');
      }
    } else {
      console.log('✅ No obvious disconnect patterns found');
    }
  }

  // Check for any ingestion runs that might show errors
  console.log('\n📊 CHECKING INGESTION RUNS FOR ERRORS:');
  const { data: runs } = await supabase
    .from('ingestion_runs')
    .select('*')
    .gte('started_at', twoDaysAgo)
    .order('started_at', { ascending: false });

  if (runs) {
    const failedRuns = runs.filter(r => r.status === 'failed');
    const incompleteRuns = runs.filter(r => !r.completed_at && r.status !== 'running');

    if (failedRuns.length > 0) {
      console.log(`\n❌ Found ${failedRuns.length} failed runs:`);
      failedRuns.forEach(run => {
        console.log(`  • ${run.source} at ${new Date(run.started_at).toLocaleString()}`);
        if (run.error_details) {
          console.log(`    Error: ${JSON.stringify(run.error_details)}`);
        }
      });
    }

    if (incompleteRuns.length > 0) {
      console.log(`\n⏸️  Found ${incompleteRuns.length} incomplete runs:`);
      incompleteRuns.forEach(run => {
        const duration = Date.now() - new Date(run.started_at).getTime();
        const minutes = Math.round(duration / (1000 * 60));
        console.log(`  • ${run.source} started ${minutes} minutes ago (${run.status})`);

        if (minutes > 60) {
          console.log(`    🚨 This run has been going for ${minutes} minutes - likely stuck!`);
        }
      });
    }

    if (failedRuns.length === 0 && incompleteRuns.length === 0) {
      console.log('✅ No failed or stuck runs found');
    }
  }

  console.log('\n💡 RECOMMENDATIONS:');
  console.log('━'.repeat(60));
  console.log('1. The issue may be intermittent - monitor next few runs closely');
  console.log('2. Add transaction support to ensure HTML and listings are saved atomically');
  console.log('3. Add better timeout handling for long-running scrapers');
  console.log('4. Implement heartbeat logging to track where scraper gets stuck');
  console.log('5. Consider splitting HTML storage and database saves into separate steps');
}

main().catch(console.error);