import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function fixDatabaseEntry() {
  const sourceUrl = 'https://bringatrailer.com/listing/2004-porsche-911-gt3-64/';

  console.log('🔍 Checking current database entry...');

  // First, check current state
  const { data: currentData, error: fetchError } = await supabase
    .from('listings')
    .select('*')
    .eq('source_url', sourceUrl)
    .single();

  if (fetchError) {
    console.error('❌ Error fetching listing:', fetchError);
    return;
  }

  if (!currentData) {
    console.log('❌ No listing found with that URL');
    return;
  }

  console.log('\n📊 Current database entry:');
  console.log('   • VIN:', currentData.vin);
  console.log('   • Mileage:', currentData.mileage);
  console.log('   • Price:', currentData.price);
  console.log('   • Year:', currentData.year);

  if (currentData.mileage === 186000) {
    console.log('\n⚠️  Mileage is WRONG (186,000). Fixing it now...');

    // Update the mileage to the correct value
    const { error: updateError } = await supabase
      .from('listings')
      .update({ mileage: 8000 })
      .eq('source_url', sourceUrl);

    if (updateError) {
      console.error('❌ Error updating listing:', updateError);
      return;
    }

    console.log('✅ Updated mileage from 186,000 to 8,000');

    // Verify the update
    const { data: updatedData, error: verifyError } = await supabase
      .from('listings')
      .select('mileage')
      .eq('source_url', sourceUrl)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
      return;
    }

    console.log('\n✅ Verification - New mileage in database:', updatedData.mileage);
  } else if (currentData.mileage === 8000) {
    console.log('\n✅ Mileage is already correct (8,000)');
  } else {
    console.log(`\n⚠️  Unexpected mileage value: ${currentData.mileage}`);
  }
}

fixDatabaseEntry().catch(console.error);