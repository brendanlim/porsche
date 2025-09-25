#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkNoVinListings() {
  console.log('🔍 Checking listings without VINs...\n');

  // Get listings without VINs
  const { data: noVinListings, error } = await supabase
    .from('listings')
    .select('id, source_url, source, title, year, model, trim, scraped_at')
    .or('vin.is.null,vin.eq.')
    .eq('model', '911')
    .ilike('trim', '%GT3%')
    .order('scraped_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error querying database:', error);
    return;
  }

  console.log(`Found ${noVinListings?.length || 0} GT3 listings without VINs (showing first 20):\n`);

  if (noVinListings && noVinListings.length > 0) {
    for (const listing of noVinListings) {
      console.log(`\n📄 Listing: ${listing.year} ${listing.model} ${listing.trim}`);
      console.log(`   ID: ${listing.id}`);
      console.log(`   Source: ${listing.source}`);
      console.log(`   URL: ${listing.source_url}`);
      console.log(`   Scraped: ${listing.scraped_at}`);

      // Check if we have HTML stored for this listing
      if (listing.source_url) {
        try {
          // Extract filename from URL for storage bucket
          const urlParts = listing.source_url.split('/');
          const possibleFilenames = [
            `${listing.source}/${urlParts[urlParts.length - 1]}.html`,
            `${listing.source}/${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}.html`,
            `listings/${listing.id}.html`
          ];

          console.log('   Checking for HTML in storage...');

          for (const filename of possibleFilenames) {
            const { data: fileData, error: fileError } = await supabase.storage
              .from('raw-html')
              .list(filename.substring(0, filename.lastIndexOf('/')), {
                search: filename.substring(filename.lastIndexOf('/') + 1)
              });

            if (!fileError && fileData && fileData.length > 0) {
              console.log(`   ✅ HTML found: ${filename}`);
              break;
            }
          }
        } catch (err) {
          console.log(`   ⚠️  Error checking HTML: ${err}`);
        }
      }
    }
  }

  // Count total listings without VINs
  const { count, error: countError } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .or('vin.is.null,vin.eq.');

  if (!countError) {
    console.log(`\n📊 Total listings without VINs: ${count}`);
  }

  // Count by source
  const { data: bySources, error: sourceError } = await supabase
    .from('listings')
    .select('source')
    .or('vin.is.null,vin.eq.');

  if (!sourceError && bySources) {
    const sourceCounts: Record<string, number> = {};
    bySources.forEach(row => {
      sourceCounts[row.source] = (sourceCounts[row.source] || 0) + 1;
    });

    console.log('\n📈 Listings without VINs by source:');
    Object.entries(sourceCounts).forEach(([source, count]) => {
      console.log(`   ${source}: ${count}`);
    });
  }
}

checkNoVinListings().catch(console.error);