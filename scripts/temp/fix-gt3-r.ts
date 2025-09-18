#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function fixGT3R() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fix the GT3 R listing
  const { data, error } = await supabase
    .from('listings')
    .update({ trim: 'GT3 R' })
    .eq('vin', 'WP0ZZZ99ZKS199508')
    .select();

  if (error) {
    console.error('Error updating:', error);
  } else {
    console.log('Updated', data?.length, 'listing(s) from GT3 to GT3 R');
    if (data?.[0]) {
      console.log('VIN:', data[0].vin);
      console.log('Model:', data[0].model);
      console.log('Trim:', data[0].trim);
      console.log('Year:', data[0].year);
      console.log('Price: $' + data[0].price?.toLocaleString());
    }
  }

  // Check for any other potential GT3 R listings that were mislabeled
  const { data: checkData } = await supabase
    .from('listings')
    .select('vin, model, trim, year, price')
    .eq('model', '911')
    .eq('trim', 'GT3')
    .gt('price', 500000)  // GT3 R are typically much more expensive
    .order('price', { ascending: false })
    .limit(10);

  if (checkData && checkData.length > 0) {
    console.log('\nPotential GT3 R listings (high-priced GT3s):');
    checkData.forEach(listing => {
      console.log(`  ${listing.vin} - ${listing.year} ${listing.model} ${listing.trim} - $${listing.price?.toLocaleString()}`);
    });
    console.log('\nNote: GT3 R race cars typically sell for $500k+ while regular GT3s are usually under $400k');
  }
}

fixGT3R().catch(console.error);