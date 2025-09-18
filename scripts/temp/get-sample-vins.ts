#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

async function getSampleVINs() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Get some interesting VINs (cars that have been listed multiple times)
  const { data } = await supabase
    .from('listings')
    .select('vin, model, trim, year, price')
    .not('vin', 'is', null)
    .order('created_at', { ascending: false })
    .limit(500);

  // Count listings per VIN
  const vinCounts: Record<string, number> = {};
  data?.forEach(listing => {
    if (listing.vin) {
      vinCounts[listing.vin] = (vinCounts[listing.vin] || 0) + 1;
    }
  });

  // Get VINs that appear multiple times (relisted)
  const multiListingVins = Object.entries(vinCounts)
    .filter(([vin, count]) => count > 1)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5)
    .map(([vin, count]) => {
      const listing = data?.find(l => l.vin === vin);
      return { vin, count, model: listing?.model, trim: listing?.trim, year: listing?.year };
    });

  console.log('VINs with multiple listings (relisted cars):');
  multiListingVins.forEach(v => {
    console.log(`${v.vin} - ${v.year} ${v.model} ${v.trim} (listed ${v.count} times)`);
  });

  // Also get some high-value GT cars
  const { data: gtCars } = await supabase
    .from('listings')
    .select('vin, model, trim, year, price')
    .not('vin', 'is', null)
    .or('trim.ilike.%GT3%,trim.ilike.%GT4%,trim.ilike.%GT2%')
    .order('price', { ascending: false })
    .limit(5);

  console.log('\nHigh-value GT cars:');
  gtCars?.forEach(car => {
    if (car.vin) {
      console.log(`${car.vin} - ${car.year} ${car.model} ${car.trim} ($${car.price?.toLocaleString()})`);
    }
  });

  // Get some random recent VINs
  const { data: recentVins } = await supabase
    .from('listings')
    .select('vin, model, trim, year')
    .not('vin', 'is', null)
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('\nRecent VINs:');
  recentVins?.forEach(car => {
    console.log(`${car.vin} - ${car.year} ${car.model} ${car.trim}`);
  });
}

getSampleVINs().catch(console.error);