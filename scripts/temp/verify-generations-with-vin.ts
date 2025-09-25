import { createClient } from '@supabase/supabase-js';
import { decodePorscheVIN } from '../../lib/utils/porsche-vin-decoder';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyGenerationsWithVIN() {
  console.log('Verifying generation data using VIN decoder...\n');

  // Get all GT4s with VINs
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, vin, year, model, trim, generation')
    .not('vin', 'is', null)
    .or('trim.ilike.%GT4%,model.ilike.%GT4%')
    .order('year', { ascending: true });

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${listings?.length || 0} GT4 listings with VINs\n`);

  const mismatches: any[] = [];
  const statistics = {
    total: 0,
    correct: 0,
    incorrect: 0,
    noVin: 0,
    decodeFailed: 0
  };

  if (listings) {
    for (const listing of listings) {
      statistics.total++;

      if (!listing.vin) {
        statistics.noVin++;
        continue;
      }

      const decoded = decodePorscheVIN(listing.vin);

      if (!decoded.generation) {
        statistics.decodeFailed++;
        continue;
      }

      // Compare database generation with decoded generation
      if (listing.generation !== decoded.generation) {
        statistics.incorrect++;
        mismatches.push({
          id: listing.id,
          vin: listing.vin,
          year: listing.year,
          model: listing.model,
          trim: listing.trim,
          dbGeneration: listing.generation,
          vinGeneration: decoded.generation,
          decodedModel: decoded.model,
          decodedTrim: decoded.trim
        });
      } else {
        statistics.correct++;
      }
    }
  }

  console.log('=== VERIFICATION SUMMARY ===');
  console.log(`Total GT4 listings: ${statistics.total}`);
  console.log(`✅ Correct generation: ${statistics.correct}`);
  console.log(`❌ Incorrect generation: ${statistics.incorrect}`);
  console.log(`⚠️  No VIN: ${statistics.noVin}`);
  console.log(`⚠️  VIN decode failed: ${statistics.decodeFailed}`);
  console.log(`\nAccuracy: ${((statistics.correct / (statistics.correct + statistics.incorrect)) * 100).toFixed(1)}%\n`);

  if (mismatches.length > 0) {
    console.log('\n=== MISMATCHES FOUND ===');
    console.log('These listings have incorrect generation in database:\n');

    // Group by year for better understanding
    const byYear = mismatches.reduce((acc, item) => {
      const year = item.year || 'unknown';
      if (!acc[year]) acc[year] = [];
      acc[year].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(byYear).forEach(([year, items]) => {
      console.log(`\nYear ${year}: ${items.length} mismatches`);
      items.slice(0, 3).forEach(item => {
        console.log(`  ID: ${item.id}`);
        console.log(`  VIN: ${item.vin}`);
        console.log(`  Database says: ${item.dbGeneration} | VIN says: ${item.vinGeneration}`);
        console.log(`  Model/Trim: ${item.model} ${item.trim}`);
        console.log('  ---');
      });
      if (items.length > 3) {
        console.log(`  ... and ${items.length - 3} more`);
      }
    });

    console.log('\n=== RECOMMENDATION ===');
    console.log('To fix these mismatches, we should update the database to match VIN decoder results.');
    console.log('This would improve data accuracy based on actual VIN information.');

    // Show what updates would be needed
    const updateGroups = mismatches.reduce((acc, item) => {
      const key = `${item.dbGeneration} -> ${item.vinGeneration}`;
      if (!acc[key]) acc[key] = 0;
      acc[key]++;
      return acc;
    }, {} as Record<string, number>);

    console.log('\nProposed updates:');
    Object.entries(updateGroups).forEach(([change, count]) => {
      console.log(`  ${change}: ${count} listings`);
    });
  } else {
    console.log('\n✅ All GT4 listings with VINs have correct generation data!');
  }
}

verifyGenerationsWithVIN().catch(console.error);