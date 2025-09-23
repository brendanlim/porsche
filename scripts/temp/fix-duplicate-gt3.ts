import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function fixDuplicateGT3() {
  const targetVIN = 'WP0AC299X4S692805';
  const targetURL1 = 'https://bringatrailer.com/listing/2004-porsche-911-gt3-64';
  const targetURL2 = 'https://bringatrailer.com/listing/2004-porsche-911-gt3-64/';

  console.log('🔍 Finding all entries for this specific 2004 GT3...\n');

  // Find all entries that match either by VIN or URL
  const { data: listings, error } = await supabase
    .from('listings')
    .select('*')
    .or(`vin.eq.${targetVIN},source_url.eq.${targetURL1},source_url.eq.${targetURL2}`)
    .order('scraped_at', { ascending: false });

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  if (!listings || listings.length === 0) {
    console.log('No listings found');
    return;
  }

  console.log(`Found ${listings.length} listing(s) for this GT3:\n`);

  for (const listing of listings) {
    console.log('─'.repeat(70));
    console.log(`ID: ${listing.id}`);
    console.log(`URL: ${listing.source_url}`);
    console.log(`VIN: ${listing.vin}`);
    console.log(`Mileage: ${listing.mileage}`);
    console.log(`Price: $${listing.price}`);
    console.log(`Source: ${listing.source}`);
    console.log(`Seller Type: ${listing.seller_type}`);
    console.log(`Scraped: ${listing.scraped_at}`);

    // Check if this needs fixing
    if (listing.mileage && listing.mileage > 100000) {
      console.log('\n⚠️  This entry has incorrect mileage! Fixing...');

      const { error: updateError } = await supabase
        .from('listings')
        .update({
          mileage: 8000,
          vin: targetVIN // Also ensure VIN is set
        })
        .eq('id', listing.id);

      if (updateError) {
        console.error('❌ Error updating:', updateError);
      } else {
        console.log('✅ Fixed mileage to 8,000 and ensured VIN is set');
      }
    } else if (!listing.vin && listing.source_url?.includes('2004-porsche-911-gt3-64')) {
      console.log('\n⚠️  This entry is missing VIN! Adding it...');

      const { error: updateError } = await supabase
        .from('listings')
        .update({ vin: targetVIN })
        .eq('id', listing.id);

      if (updateError) {
        console.error('❌ Error updating VIN:', updateError);
      } else {
        console.log('✅ Added VIN');
      }
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n🔍 Final check - all Arctic Silver 996 GT3s with high mileage...\n');

  const { data: highMileage, error: hmError } = await supabase
    .from('listings')
    .select('id, source_url, vin, mileage, color, seller_type')
    .eq('model', '911')
    .eq('trim', 'GT3')
    .eq('generation', '996')
    .gte('mileage', 100000);

  if (hmError) {
    console.error('Error:', hmError);
    return;
  }

  if (highMileage && highMileage.length > 0) {
    console.log(`⚠️ Found ${highMileage.length} 996 GT3(s) with suspiciously high mileage:`);
    for (const car of highMileage) {
      console.log(`  • ID: ${car.id}`);
      console.log(`    Mileage: ${car.mileage}, Color: ${car.color}, Seller: ${car.seller_type}`);
      console.log(`    URL: ${car.source_url}`);
      console.log(`    VIN: ${car.vin}`);
    }
  } else {
    console.log('✅ No 996 GT3s with suspiciously high mileage found');
  }
}

fixDuplicateGT3().catch(console.error);