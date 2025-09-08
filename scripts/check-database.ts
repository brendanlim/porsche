import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../lib/supabase/admin';

async function checkDatabase() {
  console.log('Checking database for listings...\n');
  
  // Check total listings
  const { count: totalCount } = await supabaseAdmin
    .from('listings')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total listings in database: ${totalCount || 0}`);
  
  // Check by source
  const { data: sources } = await supabaseAdmin
    .from('listings')
    .select('source')
    .limit(100);
  
  const sourceCounts: Record<string, number> = {};
  sources?.forEach(row => {
    sourceCounts[row.source] = (sourceCounts[row.source] || 0) + 1;
  });
  
  console.log('\nListings by source:');
  Object.entries(sourceCounts).forEach(([source, count]) => {
    console.log(`  ${source}: ${count}`);
  });
  
  // Check for GT4 RS specifically
  const { data: gt4rs } = await supabaseAdmin
    .from('listings')
    .select('title, price, year, mileage')
    .ilike('trim', '%GT4%RS%')
    .limit(5);
  
  console.log('\nSample GT4 RS listings:');
  gt4rs?.forEach(listing => {
    console.log(`  ${listing.year} - $${listing.price?.toLocaleString()} - ${listing.mileage?.toLocaleString()} miles`);
  });
  
  // Check recent listings
  const { data: recent } = await supabaseAdmin
    .from('listings')
    .select('model, trim, price, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.log('\nMost recent listings:');
  recent?.forEach(listing => {
    console.log(`  ${listing.model} ${listing.trim} - $${listing.price?.toLocaleString()} - Added: ${new Date(listing.created_at).toLocaleString()}`);
  });
  
  // Check what unique model/trim combinations we have
  const { data: modelsTrims } = await supabaseAdmin
    .from('listings')
    .select('model, trim')
    .not('trim', 'is', null);
  
  const uniqueCombos = new Set<string>();
  modelsTrims?.forEach(row => {
    if (row.model && row.trim) {
      uniqueCombos.add(`${row.model} - ${row.trim}`);
    }
  });
  
  console.log('\nUnique model/trim combinations:');
  Array.from(uniqueCombos).sort().forEach(combo => {
    console.log(`  ${combo}`);
  });
  
  // Check listings with both price AND mileage (needed for charts)
  const { data: withBoth, count: bothCount } = await supabaseAdmin
    .from('listings')
    .select('*', { count: 'exact' })
    .not('price', 'is', null)
    .not('mileage', 'is', null);
  
  console.log(`\nListings with both price AND mileage: ${bothCount || 0}`);
  
  // Check for Cayman GT4 RS specifically
  const { data: caymanGT4RS } = await supabaseAdmin
    .from('listings')
    .select('model, trim, price, mileage, year')
    .or('trim.ilike.%GT4%RS%,trim.ilike.%GT4 RS%,trim.ilike.%GT4-RS%')
    .limit(5);
  
  console.log('\nCayman GT4 RS listings found:');
  if (caymanGT4RS && caymanGT4RS.length > 0) {
    caymanGT4RS.forEach(listing => {
      console.log(`  ${listing.year} ${listing.model} ${listing.trim} - $${listing.price?.toLocaleString()} - ${listing.mileage?.toLocaleString()} miles`);
    });
  } else {
    console.log('  None found');
  }
}

checkDatabase().catch(console.error);