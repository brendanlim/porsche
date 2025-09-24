import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decodePorscheVIN } from '../../lib/utils/porsche-vin-decoder';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function verifyGT4VINDecoder() {
  console.log('Verifying VIN Decoder for GT4 Listings');
  console.log('========================================\n');

  // Get confirmed GT4 listings (not GT4 RS)
  const { data: gt4Listings } = await supabase
    .from('listings')
    .select('id, title, price, year, model, trim, vin, source')
    .eq('model', '718 Cayman')
    .eq('trim', 'GT4')
    .not('vin', 'is', null)
    .order('price', { ascending: false })
    .limit(20);

  console.log(`Testing ${gt4Listings?.length || 0} GT4 listings with VINs:\n`);

  let correctCount = 0;
  let incorrectCount = 0;
  const vinPatterns = new Map<string, number>();

  for (const listing of gt4Listings || []) {
    console.log(`\n${listing.title}`);
    console.log(`  Price: $${listing.price?.toLocaleString()}`);
    console.log(`  Year: ${listing.year}`);
    console.log(`  VIN: ${listing.vin}`);

    try {
      const decoded = decodePorscheVIN(listing.vin);
      console.log(`  Decoded:`);
      console.log(`    Model: ${decoded.model}`);
      console.log(`    Trim: ${decoded.trim || 'null'}`);
      console.log(`    Engine: ${decoded.engineType}`);
      console.log(`    Year: ${decoded.modelYear}`);

      // Track VIN patterns for GT4
      const vinPosition7_8 = listing.vin.substring(6, 8);
      vinPatterns.set(vinPosition7_8, (vinPatterns.get(vinPosition7_8) || 0) + 1);

      // Check if decoder correctly identifies GT4
      if (decoded.engineType === 'GT4' || decoded.trim === 'GT4') {
        console.log(`  ✅ Correctly identified as GT4`);
        correctCount++;
      } else {
        console.log(`  ❌ NOT identified as GT4 (shows trim: "${decoded.trim}", engine: "${decoded.engineType}")`);
        incorrectCount++;
      }
    } catch (error) {
      console.log(`  ⚠️ Error decoding: ${error}`);
      incorrectCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('VIN PATTERN ANALYSIS FOR GT4:');
  console.log('Positions 7-8 (Model/Type):');
  Array.from(vinPatterns.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([pattern, count]) => {
      console.log(`  ${pattern}: ${count} occurrences`);
    });

  // Now let's check some GT4 RS VINs for comparison
  console.log('\n' + '='.repeat(50));
  console.log('CHECKING GT4 RS VINS FOR COMPARISON:\n');

  const { data: gt4rsListings } = await supabase
    .from('listings')
    .select('id, title, price, vin')
    .eq('model', '718 Cayman')
    .ilike('trim', '%GT4%RS%')
    .not('vin', 'is', null)
    .limit(5);

  const gt4rsPatterns = new Map<string, number>();

  for (const listing of gt4rsListings || []) {
    console.log(`\n${listing.title}`);
    console.log(`  Price: $${listing.price?.toLocaleString()}`);
    console.log(`  VIN: ${listing.vin}`);

    try {
      const decoded = decodePorscheVIN(listing.vin);
      console.log(`  Decoded: Model=${decoded.model}, Trim=${decoded.trim}, Engine=${decoded.engineType}`);

      // Track VIN patterns for GT4 RS
      const vinPosition7_8 = listing.vin.substring(6, 8);
      gt4rsPatterns.set(vinPosition7_8, (gt4rsPatterns.get(vinPosition7_8) || 0) + 1);

      if (decoded.trim?.includes('GT4 RS') || decoded.engineType?.includes('GT4 RS')) {
        console.log(`  ✅ Correctly identified as GT4 RS`);
      } else {
        console.log(`  ❌ NOT identified as GT4 RS`);
      }
    } catch (error) {
      console.log(`  ⚠️ Error decoding: ${error}`);
    }
  }

  if (gt4rsPatterns.size > 0) {
    console.log('\nGT4 RS VIN Patterns (positions 7-8):');
    Array.from(gt4rsPatterns.entries()).forEach(([pattern, count]) => {
      console.log(`  ${pattern}: ${count} occurrences`);
    });
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY:');
  console.log(`  GT4 listings tested: ${gt4Listings?.length || 0}`);
  console.log(`  Correctly identified: ${correctCount}`);
  console.log(`  Incorrectly identified: ${incorrectCount}`);
  console.log(`  Accuracy: ${correctCount > 0 ? Math.round((correctCount / (correctCount + incorrectCount)) * 100) : 0}%`);

  // Check the actual VIN decoder code
  console.log('\n' + '='.repeat(50));
  console.log('CURRENT VIN DECODER LOGIC FOR GT4:');
  console.log('Looking at positions 7-8 in VIN...');
  console.log('Common GT4 patterns found:');
  console.log('  A8 = GT4 (981 generation, 2016)');
  console.log('  A8 = GT4 (982 generation, 2020+)');
  console.log('  AE = GT4 RS (982 generation, 2022+)');
}

verifyGT4VINDecoder().catch(console.error);