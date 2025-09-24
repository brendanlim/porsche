import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decodePorscheVIN } from '../../lib/utils/porsche-vin-decoder';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function verifyGT4RSListings() {
  console.log('Verifying GT4 RS Listings Using VIN Decoder');
  console.log('============================================\n');

  // Get all GT4 RS listings below $175k (suspicious)
  const { data: suspiciousListings } = await supabase
    .from('listings')
    .select('id, title, price, year, model, trim, vin, source, source_url')
    .ilike('model', '718 Cayman')
    .ilike('trim', '%GT4%RS%')
    .not('sold_date', 'is', null)
    .lt('price', 175000)
    .order('price', { ascending: true });

  console.log(`Found ${suspiciousListings?.length || 0} suspicious low-price "GT4 RS" listings\n`);

  let fixCount = 0;
  let noVinCount = 0;
  let confirmedGT4RS = 0;
  let toUpdate: Array<{id: string, correctTrim: string}> = [];

  for (const listing of suspiciousListings || []) {
    console.log(`\nChecking: ${listing.title || 'No title'}`);
    console.log(`  Current trim: ${listing.trim}`);
    console.log(`  Price: $${listing.price?.toLocaleString()}`);
    console.log(`  VIN: ${listing.vin || 'NO VIN'}`);

    if (!listing.vin) {
      noVinCount++;
      console.log(`  ⚠️  No VIN to verify`);

      // Check if title indicates it's NOT a GT4 RS
      const title = (listing.title || '').toLowerCase();
      if (title.includes('gt4') && !title.includes('rs') && !title.includes('gt4rs') && !title.includes('gt4-rs')) {
        console.log(`  📋 Title suggests regular GT4, not GT4 RS`);
        console.log(`  ✅ Will update trim from "${listing.trim}" to "GT4"`);
        toUpdate.push({ id: listing.id, correctTrim: 'GT4' });
        fixCount++;
      } else if (!title.includes('gt4')) {
        // Not even a GT4
        console.log(`  📋 Title doesn't mention GT4 at all`);
        console.log(`  ✅ Will update trim from "${listing.trim}" to null`);
        toUpdate.push({ id: listing.id, correctTrim: '' });
        fixCount++;
      }
      continue;
    }

    try {
      const decoded = decodePorscheVIN(listing.vin);
      console.log(`  Decoded:`);
      console.log(`    Model: ${decoded.model}`);
      console.log(`    Trim: ${decoded.trim || 'Base'}`);
      console.log(`    Year: ${decoded.modelYear}`);
      console.log(`    Engine: ${decoded.engineType}`);

      // Check if VIN indicates GT4 RS
      const vinIndicatesGT4RS = decoded.trim?.includes('GT4 RS') ||
                                decoded.trim?.includes('GT4RS') ||
                                decoded.engineType?.includes('GT4 RS');

      const vinIndicatesGT4 = decoded.trim?.includes('GT4') && !vinIndicatesGT4RS;

      if (vinIndicatesGT4RS) {
        console.log(`  ✓ VIN confirms GT4 RS (but price is suspiciously low)`);
        confirmedGT4RS++;
      } else if (vinIndicatesGT4) {
        console.log(`  ❌ VIN indicates regular GT4, NOT GT4 RS`);
        console.log(`  ✅ Will update trim from "${listing.trim}" to "GT4"`);
        toUpdate.push({ id: listing.id, correctTrim: 'GT4' });
        fixCount++;
      } else {
        console.log(`  ❌ VIN indicates neither GT4 nor GT4 RS`);
        const correctTrim = decoded.trim || 'Base';
        console.log(`  ✅ Will update trim from "${listing.trim}" to "${correctTrim}"`);
        toUpdate.push({ id: listing.id, correctTrim: correctTrim });
        fixCount++;
      }
    } catch (error) {
      console.log(`  ⚠️  Error decoding VIN: ${error}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY:');
  console.log(`  Total suspicious listings: ${suspiciousListings?.length || 0}`);
  console.log(`  No VIN available: ${noVinCount}`);
  console.log(`  Confirmed GT4 RS (low price): ${confirmedGT4RS}`);
  console.log(`  Mislabeled (need fixing): ${fixCount}`);

  if (toUpdate.length > 0) {
    console.log('\n' + '='.repeat(50));
    console.log('FIXING MISLABELED LISTINGS...\n');

    for (const update of toUpdate) {
      try {
        const { error } = await supabase
          .from('listings')
          .update({
            trim: update.correctTrim || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);

        if (error) {
          console.error(`  ❌ Failed to update ${update.id}: ${error.message}`);
        } else {
          console.log(`  ✅ Updated listing ${update.id} trim to "${update.correctTrim || 'null'}"`);
        }
      } catch (error) {
        console.error(`  ❌ Error updating ${update.id}: ${error}`);
      }
    }

    console.log(`\n✅ Fixed ${toUpdate.length} mislabeled listings`);
  }

  // Now check the high-price GT4 RS to make sure they're correct
  console.log('\n' + '='.repeat(50));
  console.log('VERIFYING HIGH-PRICE GT4 RS LISTINGS...\n');

  const { data: highPriceListings } = await supabase
    .from('listings')
    .select('id, title, price, vin, trim')
    .ilike('model', '718 Cayman')
    .ilike('trim', '%GT4%RS%')
    .not('sold_date', 'is', null)
    .gte('price', 175000)
    .limit(5);

  console.log(`Checking ${highPriceListings?.length || 0} high-price GT4 RS listings:\n`);

  for (const listing of highPriceListings || []) {
    console.log(`$${listing.price?.toLocaleString()} - ${listing.title?.substring(0, 50)}...`);
    if (listing.vin) {
      try {
        const decoded = decodePorscheVIN(listing.vin);
        const isGT4RS = decoded.trim?.includes('GT4 RS') || decoded.trim?.includes('GT4RS');
        console.log(`  VIN: ${isGT4RS ? '✓ Confirms GT4 RS' : '❌ ' + decoded.trim}`);
      } catch {
        console.log(`  VIN: Unable to decode`);
      }
    } else {
      console.log(`  No VIN available`);
    }
  }
}

verifyGT4RSListings().catch(console.error);