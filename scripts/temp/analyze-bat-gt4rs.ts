#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function analyzeBaTGT4RS() {
  // Get all GT4 RS listings from BaT
  const { data: batListings } = await supabase
    .from('listings')
    .select('id, vin, source_url, exterior_color, price, mileage')
    .ilike('trim', '%GT4 RS%')
    .eq('source', 'bring-a-trailer')
    .order('source_url');

  console.log('All GT4 RS BaT listings:\n');

  const withData: typeof batListings = [];
  const noData: typeof batListings = [];

  batListings?.forEach(l => {
    if (!l.exterior_color && (!l.price || l.price === 0)) {
      noData.push(l);
    } else {
      withData.push(l);
    }
  });

  console.log(`Total BaT GT4 RS listings: ${batListings?.length || 0}`);
  console.log(`  With data: ${withData.length}`);
  console.log(`  Without data: ${noData.length}\n`);

  if (noData.length > 0) {
    console.log('Listings without color AND price (candidates for deletion):\n');
    noData.forEach((l, idx) => {
      const urlPart = l.source_url.split('/').slice(-2).join('/');
      console.log(`${idx + 1}. ID: ${l.id}`);
      console.log(`   URL: .../${urlPart}`);
      console.log(`   VIN: ${l.vin || 'NULL'}`);
      console.log(`   Color: ${l.exterior_color || 'NULL'}`);
      console.log(`   Price: ${l.price || 'NULL'}`);
      console.log('');
    });

    console.log('These appear to be incomplete scraped listings.\n');
    console.log('Should we delete them? (They have no useful data)\n');

    // Actually delete them
    const idsToDelete = noData.map(l => l.id);

    console.log(`🗑️  Deleting ${idsToDelete.length} incomplete listings...`);

    const { error: deleteError } = await supabase
      .from('listings')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('❌ Error deleting:', deleteError);
    } else {
      console.log('✅ Successfully deleted incomplete listings');
    }
  }

  // Check remaining
  const { count: remaining } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .ilike('trim', '%GT4 RS%');

  console.log(`\nRemaining GT4 RS listings: ${remaining}`);
}

analyzeBaTGT4RS().catch(console.error);