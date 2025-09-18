#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTurboSMileage() {
  const { data, count } = await supabase
    .from('listings')
    .select('mileage, price, year', { count: 'exact' })
    .ilike('model', '911')
    .ilike('trim', 'turbo s');
  
  console.log('Total Turbo S listings:', count);
  console.log('With mileage:', data?.filter(l => l.mileage && l.mileage > 0).length);
  console.log('Without mileage:', data?.filter(l => !l.mileage || l.mileage === 0).length);
  
  // Group by mileage ranges
  const withMileage = data?.filter(l => l.mileage && l.mileage > 0) || [];
  const ranges = {
    '0-5k': withMileage.filter(l => l.mileage < 5000),
    '5k-10k': withMileage.filter(l => l.mileage >= 5000 && l.mileage < 10000),
    '10k-20k': withMileage.filter(l => l.mileage >= 10000 && l.mileage < 20000),
    '20k-30k': withMileage.filter(l => l.mileage >= 20000 && l.mileage < 30000),
    '30k+': withMileage.filter(l => l.mileage >= 30000)
  };
  
  console.log('\nMileage Distribution (listings with mileage):');
  Object.entries(ranges).forEach(([range, listings]) => {
    if (listings.length > 0) {
      const avgPrice = listings.reduce((sum, l) => sum + l.price, 0) / listings.length;
      console.log(`  ${range}: ${listings.length} listings, avg price: $${avgPrice.toLocaleString()}`);
    } else {
      console.log(`  ${range}: 0 listings`);
    }
  });
  
  // Show sample mileage values
  console.log('\nSample listings:');
  data?.slice(0, 10).forEach(l => {
    console.log(`  Year: ${l.year}, Mileage: ${l.mileage || 'N/A'}, Price: $${l.price?.toLocaleString()}`);
  });
}

checkTurboSMileage().catch(console.error);