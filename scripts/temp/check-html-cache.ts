#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkHTMLCache() {
  console.log('📊 Checking raw_html_cache table...\n');

  // Get count of cached HTML
  const { count, error: countError } = await supabase
    .from('raw_html_cache')
    .select('*', { count: 'exact', head: true });

  if (!countError) {
    console.log(`Total cached HTML entries: ${count}\n`);
  }

  // Check recent entries
  const { data: recentCache, error } = await supabase
    .from('raw_html_cache')
    .select('url, source, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error querying cache:', error);
    return;
  }

  if (recentCache && recentCache.length > 0) {
    console.log('Recent cached entries:');
    recentCache.forEach(entry => {
      const urlParts = entry.url?.split('/') || [];
      const slug = urlParts[urlParts.length - 1] || entry.url;
      console.log(`  ${entry.created_at}: [${entry.source}] ${slug?.substring(0, 50)}`);
    });
  }

  // Check for BaT entries specifically
  const { count: batCount, error: batError } = await supabase
    .from('raw_html_cache')
    .select('*', { count: 'exact', head: true })
    .ilike('url', '%bringatrailer.com%');

  if (!batError) {
    console.log(`\nBring a Trailer cached entries: ${batCount}`);
  }

  // Check for listings with matching URLs in cache
  const { data: matchingListings } = await supabase
    .from('listings')
    .select('source_url')
    .or('vin.is.null,vin.eq.')
    .limit(10);

  if (matchingListings) {
    console.log('\nChecking if we have cache for listings without VINs:');
    for (const listing of matchingListings) {
      if (!listing.source_url) continue;

      const { data: cached } = await supabase
        .from('raw_html_cache')
        .select('id')
        .eq('url', listing.source_url)
        .limit(1)
        .single();

      const status = cached ? '✅ Cached' : '❌ Not cached';
      const urlParts = listing.source_url.split('/');
      console.log(`  ${status}: ${urlParts[urlParts.length - 1]?.substring(0, 40)}`);
    }
  }
}

checkHTMLCache().catch(console.error);