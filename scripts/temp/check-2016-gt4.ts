import { createClient } from '@supabase/supabase-js';
import { decodePorscheVIN } from '../../lib/utils/porsche-vin-decoder';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check2016GT4() {
  console.log('Checking for 2016 GT4 listings with incorrect generation...\n');

  // Find 2016 GT4s
  const { data: listings, error } = await supabase
    .from('listings')
    .select('*')
    .eq('year', 2016)
    .or('trim.ilike.%GT4%,model.ilike.%GT4%');

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${listings?.length || 0} 2016 GT4 listings\n`);

  if (listings && listings.length > 0) {
    for (const listing of listings) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`Listing ID: ${listing.id}`);
      console.log(`URL: ${listing.url || listing.source_url}`);
      console.log(`VIN: ${listing.vin}`);
      console.log(`Year: ${listing.year}`);
      console.log(`Model: ${listing.model}`);
      console.log(`Trim: ${listing.trim}`);
      console.log(`Current Generation: ${listing.generation}`);
      console.log(`Price: $${listing.price?.toLocaleString()}`);
      console.log(`Mileage: ${listing.mileage?.toLocaleString()} miles`);
      console.log(`Source: ${listing.source}`);

      // Check generation
      if (listing.generation === '982' || listing.generation === '982.1') {
        console.log('\n⚠️  ERROR: 2016 GT4 marked as 982 generation!');
        console.log('   This should be 981 generation (2016 is 981 GT4)');
        console.log('   982 GT4 started in 2020');
      } else if (listing.generation === '981' || listing.generation === '981.1') {
        console.log('\n✅ Correct: 2016 GT4 properly marked as 981 generation');
      } else if (!listing.generation) {
        console.log('\n⚠️  Missing generation data for 2016 GT4 (should be 981)');
      }

      if (listing.vin) {
        console.log('\nVIN Decoder Results:');
        const decoded = decodePorscheVIN(listing.vin);
        console.log(`  Decoded Model: ${decoded.model || 'Unknown'}`);
        console.log(`  Decoded Trim: ${decoded.trim || 'Unknown'}`);
        console.log(`  Decoded Generation: ${decoded.generation || 'Unknown'}`);
        console.log(`  Decoded Year: ${decoded.year || 'Unknown'}`);

        if (decoded.generation === '982') {
          console.log('  ⚠️  VIN decoder also says 982 - needs investigation');
        }
      }
      console.log('═══════════════════════════════════════════════════════════════\n');
    }
  }

  // Also check for any 982 GT4s with year < 2020
  console.log('\nChecking for any 982 generation GT4s before 2020...\n');

  const { data: gen982, error: genError } = await supabase
    .from('listings')
    .select('*')
    .ilike('generation', '%982%')
    .or('trim.ilike.%GT4%,model.ilike.%GT4%')
    .lt('year', 2020);

  if (gen982 && gen982.length > 0) {
    console.log(`⚠️  Found ${gen982.length} 982 GT4s with year before 2020:\n`);

    for (const listing of gen982) {
      console.log(`ID: ${listing.id}`);
      console.log(`Year: ${listing.year}, Generation: ${listing.generation}`);
      console.log(`Model: ${listing.model}, Trim: ${listing.trim}`);
      console.log(`Price: $${listing.price?.toLocaleString()}`);
      console.log(`VIN: ${listing.vin}`);
      console.log('This needs correction - 982 GT4 started in 2020\n');
    }
  } else {
    console.log('No 982 GT4s found with year before 2020');
  }
}

check2016GT4().catch(console.error);