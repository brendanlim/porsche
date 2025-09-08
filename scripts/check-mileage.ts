import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../lib/supabase/admin';

async function checkMileage() {
  console.log('🔍 Checking mileage data in database...\n');
  
  // Check GT3 listings
  const { data: gt3Listings, error: gt3Error } = await supabaseAdmin
    .from('listings')
    .select('id, title, model, trim, mileage, price, source')
    .eq('model', '911')
    .eq('trim', 'GT3');
  
  if (gt3Error) {
    console.error('Error fetching GT3 listings:', gt3Error);
    return;
  }
  
  console.log(`Found ${gt3Listings?.length || 0} GT3 listings\n`);
  
  // Count how many have mileage
  const withMileage = gt3Listings?.filter(l => l.mileage && l.mileage > 0) || [];
  const withoutMileage = gt3Listings?.filter(l => !l.mileage || l.mileage === 0) || [];
  
  console.log(`📊 Mileage Stats for GT3:`);
  console.log(`  - With mileage: ${withMileage.length} listings`);
  console.log(`  - Without mileage: ${withoutMileage.length} listings`);
  
  if (withMileage.length > 0) {
    const avgMileage = withMileage.reduce((sum, l) => sum + (l.mileage || 0), 0) / withMileage.length;
    console.log(`  - Average mileage: ${Math.round(avgMileage).toLocaleString()} miles`);
    
    console.log('\nSample listings with mileage:');
    withMileage.slice(0, 5).forEach(l => {
      console.log(`  - ${l.title.substring(0, 50)}... | ${l.mileage?.toLocaleString()} miles | $${l.price?.toLocaleString()} | ${l.source}`);
    });
  }
  
  if (withoutMileage.length > 0) {
    console.log('\nSample listings WITHOUT mileage:');
    withoutMileage.slice(0, 5).forEach(l => {
      console.log(`  - ${l.title.substring(0, 50)}... | ${l.source}`);
    });
  }
  
  // Check all listings
  const { data: allListings } = await supabaseAdmin
    .from('listings')
    .select('id, mileage');
  
  const allWithMileage = allListings?.filter(l => l.mileage && l.mileage > 0) || [];
  
  console.log(`\n📈 Overall Database Stats:`);
  console.log(`  - Total listings: ${allListings?.length || 0}`);
  console.log(`  - Listings with mileage: ${allWithMileage.length}`);
  console.log(`  - Percentage with mileage: ${((allWithMileage.length / (allListings?.length || 1)) * 100).toFixed(1)}%`);
}

checkMileage().catch(console.error);