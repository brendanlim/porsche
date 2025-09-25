#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkDuplicates() {
  // These are the VINs we found when scraping
  const vins = [
    'WP0AE2A86PS280088',
    'WP0AE2A81PS280046'
  ];

  console.log('Checking for duplicate VINs...\n');

  for (const vin of vins) {
    const { data: listings } = await supabase
      .from('listings')
      .select('id, source, source_url, vin, exterior_color, trim')
      .eq('vin', vin);

    if (listings && listings.length > 0) {
      console.log(`VIN ${vin}:`);
      listings.forEach(l => {
        console.log(`  ID: ${l.id} - Trim: ${l.trim} - Color: ${l.exterior_color || 'NULL'}`);
        console.log(`     Source: ${l.source}`);
        console.log(`     URL: ${l.source_url}`);
      });
      console.log('');
    }
  }

  // Now check the BaT listings without VINs that we're trying to update
  console.log('BaT GT4 RS listings without VINs or colors:\n');
  const { data: batListings } = await supabase
    .from('listings')
    .select('id, source_url, vin, exterior_color')
    .ilike('trim', '%GT4 RS%')
    .eq('source', 'bring-a-trailer')
    .or('vin.is.null,exterior_color.is.null');

  batListings?.forEach(l => {
    console.log(`ID: ${l.id}`);
    console.log(`  URL: ${l.source_url}`);
    console.log(`  VIN: ${l.vin || 'NULL'}`);
    console.log(`  Color: ${l.exterior_color || 'NULL'}`);
    console.log('');
  });
}

checkDuplicates().catch(console.error);