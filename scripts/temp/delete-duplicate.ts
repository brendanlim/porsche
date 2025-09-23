import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function deleteDuplicate() {
  console.log('🔍 Handling duplicate GT3 entries...\n');

  // The entry WITHOUT VIN (the problematic one that had 186k miles)
  const duplicateId = '5538ce73-373e-4f82-9c9a-287dd538b7c8';

  // The correct entry WITH VIN
  const correctId = '7e1ee597-9f71-48d5-9118-3f3875ab6b0b';

  console.log('Deleting duplicate entry without VIN (ID: ' + duplicateId + ')...');

  const { error: deleteError } = await supabase
    .from('listings')
    .delete()
    .eq('id', duplicateId);

  if (deleteError) {
    console.error('❌ Error deleting duplicate:', deleteError);
  } else {
    console.log('✅ Deleted duplicate entry');
  }

  console.log('\n🔍 Verifying the correct entry remains...\n');

  const { data: remaining, error: fetchError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', correctId)
    .single();

  if (fetchError) {
    console.error('Error fetching:', fetchError);
  } else if (remaining) {
    console.log('✅ Correct entry remains:');
    console.log('   • ID:', remaining.id);
    console.log('   • VIN:', remaining.vin);
    console.log('   • Mileage:', remaining.mileage);
    console.log('   • Price:', remaining.price);
    console.log('   • URL:', remaining.source_url);
  }

  console.log('\n🔍 Final check - any 996 GT3s with seller_type "Private Party"...\n');

  const { data: privateParty, error: ppError } = await supabase
    .from('listings')
    .select('id, source_url, vin, mileage, seller_type, year')
    .eq('model', '911')
    .eq('trim', 'GT3')
    .eq('generation', '996')
    .eq('seller_type', 'Private Party');

  if (ppError) {
    console.error('Error:', ppError);
  } else if (privateParty && privateParty.length > 0) {
    console.log(`Found ${privateParty.length} 996 GT3(s) listed as "Private Party":`);
    for (const car of privateParty) {
      console.log(`  • Year: ${car.year}, Mileage: ${car.mileage}`);
      console.log(`    URL: ${car.source_url}`);

      // These are from BaT and shouldn't be "Private Party"
      if (car.source_url?.includes('bringatrailer.com')) {
        console.log('    ⚠️  This is from BaT, fixing seller_type...');

        const { error: updateError } = await supabase
          .from('listings')
          .update({ seller_type: null })
          .eq('id', car.id);

        if (updateError) {
          console.error('    ❌ Error updating:', updateError);
        } else {
          console.log('    ✅ Fixed seller_type');
        }
      }
    }
  } else {
    console.log('No 996 GT3s with "Private Party" seller type found');
  }
}

deleteDuplicate().catch(console.error);