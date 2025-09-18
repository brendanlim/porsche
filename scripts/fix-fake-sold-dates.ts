#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixFakeSoldDates() {
  console.log('='.repeat(80));
  console.log('REMOVING FAKE SOLD DATES (9-10-2025 / 9-11-2025)');
  console.log('='.repeat(80));
  
  // Check how many listings have these fake dates
  const { data: fakeDate1, count: count1 } = await supabase
    .from('listings')
    .select('id, vin, model, trim, sold_date', { count: 'exact' })
    .eq('sold_date', '2025-09-10');
  
  const { data: fakeDate2, count: count2 } = await supabase
    .from('listings')
    .select('id, vin, model, trim, sold_date', { count: 'exact' })
    .eq('sold_date', '2025-09-11');
    
  console.log(`Found ${count1 || 0} listings with sold_date = 2025-09-10`);
  console.log(`Found ${count2 || 0} listings with sold_date = 2025-09-11`);
  
  const totalFake = (count1 || 0) + (count2 || 0);
  
  if (totalFake === 0) {
    console.log('\n✅ No fake sold dates found!');
    return;
  }
  
  // Show sample of affected listings
  console.log('\nSample of affected listings:');
  const samples = [...(fakeDate1 || []).slice(0, 5), ...(fakeDate2 || []).slice(0, 5)];
  samples.forEach(listing => {
    console.log(`  - ${listing.model} ${listing.trim} (VIN: ${listing.vin}): ${listing.sold_date}`);
  });
  
  // Set these dates to NULL
  console.log('\nSetting fake sold_date values to NULL...');
  
  // Update 2025-09-10 dates
  if (count1 && count1 > 0) {
    const { error: error1 } = await supabase
      .from('listings')
      .update({ sold_date: null })
      .eq('sold_date', '2025-09-10');
    
    if (error1) {
      console.error('Error updating 2025-09-10 dates:', error1);
    } else {
      console.log(`✅ Reset ${count1} listings with 2025-09-10`);
    }
  }
  
  // Update 2025-09-11 dates
  if (count2 && count2 > 0) {
    const { error: error2 } = await supabase
      .from('listings')
      .update({ sold_date: null })
      .eq('sold_date', '2025-09-11');
    
    if (error2) {
      console.error('Error updating 2025-09-11 dates:', error2);
    } else {
      console.log(`✅ Reset ${count2} listings with 2025-09-11`);
    }
  }
  
  // Also check for any future dates (anything after today)
  const today = new Date().toISOString().split('T')[0];
  console.log(`\nChecking for any future dates (after ${today})...`);
  
  const { data: futureDates, count: futureCount } = await supabase
    .from('listings')
    .select('id, vin, model, trim, sold_date', { count: 'exact' })
    .gt('sold_date', today);
  
  if (futureCount && futureCount > 0) {
    console.log(`Found ${futureCount} listings with future sold dates`);
    
    // Show unique future dates
    const uniqueDates = [...new Set(futureDates?.map(d => d.sold_date))].sort();
    console.log('Future dates found:', uniqueDates);
    
    // Set all future dates to NULL
    const { error: errorFuture } = await supabase
      .from('listings')
      .update({ sold_date: null })
      .gt('sold_date', today);
    
    if (errorFuture) {
      console.error('Error updating future dates:', errorFuture);
    } else {
      console.log(`✅ Reset ${futureCount} listings with future dates`);
    }
  } else {
    console.log('No future dates found');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('COMPLETE');
  console.log('='.repeat(80));
  
  // Final statistics
  const { count: withSoldDate } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .not('sold_date', 'is', null);
  
  const { count: withoutSoldDate } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .is('sold_date', null);
  
  console.log(`\n📊 Final Statistics:`);
  console.log(`  Listings with valid sold_date: ${withSoldDate}`);
  console.log(`  Listings without sold_date: ${withoutSoldDate}`);
  console.log(`  Total fake dates removed: ${totalFake + (futureCount || 0)}`);
}

fixFakeSoldDates().catch(console.error);