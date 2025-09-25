#!/usr/bin/env npx tsx
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load environment - conditional dotenv for local development
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  try {
    const dotenv = require('dotenv');
    dotenv.config({ path: envPath });
    console.log('Loaded environment variables from .env.local');
  } catch (error) {
    console.log('dotenv not available, using environment variables from system');
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('📊 Database Status Check\n');

  // Check total listings
  const { count: totalListings, error: totalError } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    console.error('Error getting total listings:', totalError);
    return;
  }

  console.log(`Total listings in database: ${totalListings}`);

  // Check recent listings (last 24 hours)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const { data: recentListings, error: recentError } = await supabase
    .from('listings')
    .select('source, model, trim, scraped_at')
    .gte('scraped_at', yesterday.toISOString());

  if (recentError) {
    console.error('Error getting recent listings:', recentError);
    return;
  }

  console.log(`\nListings scraped in last 24 hours: ${recentListings?.length || 0}`);

  // Group by source
  if (recentListings && recentListings.length > 0) {
    const sourceStats: Record<string, number> = {};
    recentListings.forEach(listing => {
      sourceStats[listing.source] = (sourceStats[listing.source] || 0) + 1;
    });

    console.log('\nBreakdown by source (last 24h):');
    Object.entries(sourceStats).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} listings`);
    });
  }

  // Check ingestion runs (recent activity)
  const { data: runs, error: runsError } = await supabase
    .from('ingestion_runs')
    .select('source, status, started_at, completed_at, total_processed')
    .gte('started_at', yesterday.toISOString())
    .order('started_at', { ascending: false })
    .limit(10);

  if (runsError) {
    console.error('Error getting ingestion runs:', runsError);
    return;
  }

  console.log(`\nRecent ingestion runs (last 24h): ${runs?.length || 0}`);
  if (runs && runs.length > 0) {
    runs.forEach(run => {
      const duration = run.completed_at
        ? Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)
        : 'running';
      console.log(`  ${run.source}: ${run.status} - ${run.total_processed || 0} listings (${duration}s)`);
    });
  }

}

main().catch(console.error);