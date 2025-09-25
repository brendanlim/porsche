import { createClient } from '@supabase/supabase-js';
import { decodePorscheVIN } from '../../lib/utils/porsche-vin-decoder';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSuspiciousGT4() {
  console.log('Checking for suspicious $17k GT4 listing...\n');

  // Find listings with price around $17k and labeled as GT4
  const { data: listings, error } = await supabase
    .from('listings')
    .select('*')
    .gte('price', 15000)
    .lte('price', 20000)
    .or('trim.ilike.%GT4%,model.ilike.%GT4%')
    .order('price', { ascending: true });

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${listings?.length || 0} listings between $15k-$20k with GT4 in model/trim\n`);

  if (listings && listings.length > 0) {
    for (const listing of listings) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`Listing ID: ${listing.id}`);
      console.log(`URL: ${listing.url}`);
      console.log(`VIN: ${listing.vin}`);
      console.log(`Current Model: ${listing.model}`);
      console.log(`Current Trim: ${listing.trim}`);
      console.log(`Current Generation: ${listing.generation}`);
      console.log(`Price: $${listing.price?.toLocaleString()}`);
      console.log(`Year: ${listing.year}`);
      console.log(`Mileage: ${listing.mileage?.toLocaleString()} miles`);
      console.log(`Source: ${listing.source}`);

      if (listing.vin) {
        console.log('\nVIN Decoder Results:');
        console.log('───────────────────────');
        const decoded = decodePorscheVIN(listing.vin);
        console.log(`Decoded Model: ${decoded.model || 'Unknown'}`);
        console.log(`Decoded Trim: ${decoded.trim || 'Unknown'}`);
        console.log(`Decoded Generation: ${decoded.generation || 'Unknown'}`);
        console.log(`Decoded Year: ${decoded.year || 'Unknown'}`);
        console.log(`Confidence: ${decoded.confidence || 'Unknown'}`);

        // Check if this is actually a GT4
        const isReallyGT4 = decoded.trim?.includes('GT4') || decoded.model?.includes('GT4');

        if (!isReallyGT4 && (listing.model?.includes('GT4') || listing.trim?.includes('GT4'))) {
          console.log('\n⚠️  WARNING: This listing is incorrectly labeled as GT4!');
          console.log(`   Actual model/trim: ${decoded.model} ${decoded.trim}`);
          console.log('   This needs to be corrected in the database.');
        } else if (isReallyGT4 && listing.price < 100000) {
          console.log('\n🚨 ALERT: Genuine GT4 at suspiciously low price!');
          console.log('   This could be a data error or incredible deal.');
        }
      }
      console.log('═══════════════════════════════════════════════════════════════\n');
    }
  } else {
    // Check for any 982 generation cars at this price
    console.log('\nChecking for any 982 generation cars at $15k-$20k...\n');

    const { data: gen982, error: genError } = await supabase
      .from('listings')
      .select('*')
      .gte('price', 15000)
      .lte('price', 20000)
      .ilike('generation', '%982%')
      .order('price', { ascending: true });

    if (gen982 && gen982.length > 0) {
      console.log(`Found ${gen982.length} 982-generation listings at this price:\n`);

      for (const listing of gen982) {
        console.log(`ID: ${listing.id}`);
        console.log(`Model: ${listing.model}, Trim: ${listing.trim}, Gen: ${listing.generation}`);
        console.log(`Price: $${listing.price?.toLocaleString()}`);
        console.log(`VIN: ${listing.vin}`);

        if (listing.vin) {
          const decoded = decodePorscheVIN(listing.vin);
          console.log(`Decoded: ${decoded.model} ${decoded.trim} (${decoded.generation})`);
        }
        console.log('---');
      }
    }
  }
}

checkSuspiciousGT4().catch(console.error);