#!/usr/bin/env npx tsx
// Load environment variables BEFORE any imports
import path from 'path';
import fs from 'fs';

// Function to load environment variables (for local development only)
async function loadEnvironmentVariables() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    try {
      // Try to import dotenv only when needed (local development)
      const dotenv = await import('dotenv');
      dotenv.config({ path: envPath });
      console.log('Loaded environment variables from .env.local');
    } catch (error) {
      // Dotenv not available (GitHub Actions), skip loading
      console.log('dotenv not available, using environment variables from system');
    }
  } else {
    console.log('Using environment variables from system/GitHub Actions');
  }
}

// Function to validate environment variables and create Supabase client
function validateAndCreateSupabaseClient() {
  const requiredEnvVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease set these in GitHub Secrets or .env.local');
    process.exit(1);
  }

  // Create Supabase client
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

async function main() {
  // Load environment variables first
  await loadEnvironmentVariables();

  // Validate environment variables and create Supabase client
  const supabase = validateAndCreateSupabaseClient();

  console.log('\n' + '█'.repeat(80));
  console.log(' '.repeat(25) + 'BRIGHT DATA COST ANALYSIS');
  console.log('█'.repeat(80));

  // Get HTML storage stats
  console.log('\n🔍 Checking HTML Storage Statistics...');

  const { data: htmlCache } = await supabase
    .from('raw_html_cache')
    .select('file_size, scraped_at, source, url')
    .order('scraped_at', { ascending: false })
    .limit(1000);

  if (htmlCache && htmlCache.length > 0) {
    const totalFiles = htmlCache.length;
    const totalSizeMB = htmlCache.reduce((sum: number, item: any) => sum + item.file_size, 0) / 1024 / 1024;
    const avgSizeKB = (totalSizeMB * 1024) / totalFiles;

    console.log(`📊 Recent HTML Cache Stats (last 1000 entries):`);
    console.log(`   Total files: ${totalFiles.toLocaleString()}`);
    console.log(`   Total size: ${totalSizeMB.toFixed(2)} MB`);
    console.log(`   Average file size: ${avgSizeKB.toFixed(1)} KB`);

    // Get date range
    const oldest = new Date(htmlCache[htmlCache.length - 1].scraped_at);
    const newest = new Date(htmlCache[0].scraped_at);
    console.log(`   Date range: ${oldest.toLocaleDateString()} to ${newest.toLocaleDateString()}`);

    // Source breakdown
    const sources = htmlCache.reduce((acc: any, item: any) => {
      acc[item.source] = (acc[item.source] || 0) + 1;
      return acc;
    }, {});
    console.log(`   Sources: ${JSON.stringify(sources, null, 4)}`);

    // Calculate monthly data usage projection
    const daysDiff = (newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24);
    const dailyMB = totalSizeMB / daysDiff;
    const monthlyMB = dailyMB * 30;
    const monthlyGB = monthlyMB / 1024;

    console.log(`\n💰 Cost Projection:`);
    console.log(`   Daily average: ${dailyMB.toFixed(2)} MB`);
    console.log(`   Monthly projection: ${monthlyGB.toFixed(2)} GB`);
    console.log(`   At $8/GB: $${(monthlyGB * 8).toFixed(2)}/month`);

    // Check for duplicate URLs - this is the key insight
    console.log(`\n🔍 Duplicate Analysis:`);
    const urlCounts = htmlCache.reduce((acc: any, item: any) => {
      acc[item.url] = (acc[item.url] || 0) + 1;
      return acc;
    }, {});

    const duplicateUrls = Object.entries(urlCounts).filter(([_, count]) => (count as number) > 1);
    const totalDuplicates = duplicateUrls.reduce((sum, [_, count]) => sum + (count as number - 1), 0);

    console.log(`   Unique URLs: ${Object.keys(urlCounts).length}`);
    console.log(`   Total fetches: ${totalFiles}`);
    console.log(`   Duplicate fetches: ${totalDuplicates}`);
    console.log(`   Duplicate rate: ${((totalDuplicates / totalFiles) * 100).toFixed(1)}%`);

    if (duplicateUrls.length > 0) {
      console.log(`\n   Top duplicated URLs:`);
      const sortedDuplicates = duplicateUrls.sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5);
      sortedDuplicates.forEach(([url, count]) => {
        const shortUrl = url.length > 60 ? url.substring(0, 60) + '...' : url;
        console.log(`     ${count}x: ${shortUrl}`);
      });
    }
  }

  // Get listings count and recent activity
  console.log(`\n📋 Database Activity:`);

  const { count: totalListings } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true });

  console.log(`   Total listings: ${totalListings?.toLocaleString() || 0}`);

  // Recent listings
  const { data: recentListings } = await supabase
    .from('listings')
    .select('source, scraped_at')
    .order('scraped_at', { ascending: false })
    .limit(100);

  if (recentListings && recentListings.length > 0) {
    const recentSources = recentListings.reduce((acc: any, item: any) => {
      acc[item.source] = (acc[item.source] || 0) + 1;
      return acc;
    }, {});

    console.log(`   Recent listings by source:`);
    Object.entries(recentSources).forEach(([source, count]) => {
      console.log(`     ${source}: ${count}`);
    });
  }

  // Check ingestion runs for cost patterns
  console.log(`\n🏃 Recent Ingestion Runs:`);

  const { data: recentRuns } = await supabase
    .from('ingestion_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(10);

  if (recentRuns && recentRuns.length > 0) {
    recentRuns.forEach((run: any) => {
      const duration = run.ended_at ?
        Math.round((new Date(run.ended_at).getTime() - new Date(run.started_at).getTime()) / 1000 / 60) :
        'ongoing';
      console.log(`   ${run.started_at.substring(0, 10)}: ${run.source || 'all'} - ${run.total_found || 0} found, ${run.total_saved || 0} saved (${duration}min)`);
    });
  }

  console.log('\n' + '█'.repeat(80));
}

// Run main with error handling
main().catch((error) => {
  console.error('❌ FATAL ERROR in cost analysis:');
  console.error(error);
  process.exit(1);
});