import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function fixGT4RSMileage() {
  console.log('Fixing GT4 RS mileage issues...\n');

  // Find GT4 RS listings with unrealistic mileage
  const { data: badListings, error } = await supabase
    .from('listings')
    .select('id, model, trim, year, mileage, title, source_url')
    .or('trim.ilike.%gt4%rs%,trim.ilike.%gt4-rs%,trim.ilike.%gt4 rs%')
    .gte('mileage', 50000);

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  if (!badListings || badListings.length === 0) {
    console.log('No GT4 RS listings with high mileage found.');
    return;
  }

  console.log(`Found ${badListings.length} GT4 RS listings with unrealistic mileage:\n`);

  for (const listing of badListings) {
    console.log(`Processing: ${listing.title}`);
    console.log(`  Current mileage: ${listing.mileage?.toLocaleString()} miles`);
    console.log(`  URL: ${listing.source_url}`);

    // GT4 RS was introduced in 2022, so max realistic mileage is ~30k miles
    // Most GT4 RS have under 10k miles
    if (listing.mileage && listing.mileage > 30000) {
      // Check if the mileage might be in KM mistakenly treated as miles
      const possibleKmToMiles = Math.round(listing.mileage * 0.621371);

      // Check if it could be a parsing error (extra digit)
      const possibleExtraDigit = Math.floor(listing.mileage / 10);
      const possibleExtraHundred = Math.floor(listing.mileage / 100);

      let correctedMileage: number | null = null;

      // If the number divided by 100 gives a reasonable mileage for a GT4 RS
      if (possibleExtraHundred > 100 && possibleExtraHundred < 30000) {
        correctedMileage = possibleExtraHundred;
        console.log(`  Likely parsing error (extra zeros): ${correctedMileage} miles`);
      }
      // If the number divided by 10 gives reasonable mileage
      else if (possibleExtraDigit > 100 && possibleExtraDigit < 30000) {
        correctedMileage = possibleExtraDigit;
        console.log(`  Likely parsing error (extra digit): ${correctedMileage} miles`);
      }
      // For very high numbers, set to NULL and let it be re-scraped
      else {
        correctedMileage = null;
        console.log(`  Setting to NULL (will need re-scraping)`);
      }

      // Update the listing
      const { error: updateError } = await supabase
        .from('listings')
        .update({ mileage: correctedMileage })
        .eq('id', listing.id);

      if (updateError) {
        console.error(`  Error updating listing ${listing.id}:`, updateError);
      } else {
        console.log(`  ✅ Updated mileage to: ${correctedMileage ? correctedMileage.toLocaleString() + ' miles' : 'NULL'}`);
      }
    }
    console.log('');
  }

  // Also add a data quality check for future inserts
  console.log('\nRecommendation: Add validation to scrapers to reject GT4 RS with > 30k miles');
  console.log('GT4 RS realistic mileage ranges:');
  console.log('  • 2022 models: 100 - 15,000 miles');
  console.log('  • 2023 models: 100 - 10,000 miles');
  console.log('  • 2024 models: 10 - 5,000 miles');
}

fixGT4RSMileage().catch(console.error);