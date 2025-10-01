import { createClient } from '@supabase/supabase-js';
import { normalizeColor, needsNormalization } from '../../lib/color-normalizer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function normalizeExistingColors() {
  console.log('Starting color normalization for existing database records...\n');

  // Get all listings with colors
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, exterior_color, interior_color, model, trim, year')
    .or('exterior_color.not.is.null,interior_color.not.is.null');

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${listings?.length || 0} listings with color data\n`);

  let exteriorNormalized = 0;
  let interiorNormalized = 0;
  let skipped = 0;
  let errors = 0;

  const batchSize = 50;
  const batches = [];

  // Process in batches
  for (let i = 0; i < (listings?.length || 0); i += batchSize) {
    const batch = listings?.slice(i, i + batchSize) || [];
    batches.push(batch);
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`Processing batch ${batchIndex + 1}/${batches.length}...`);

    for (const listing of batch) {
      const updates: any = {};
      let needsUpdate = false;

      // Check exterior color
      if (listing.exterior_color && needsNormalization(listing.exterior_color)) {
        const normalized = normalizeColor(listing.exterior_color);
        if (normalized && normalized !== listing.exterior_color) {
          updates.exterior_color = normalized;
          needsUpdate = true;
          exteriorNormalized++;
          console.log(`  🎨 Exterior: "${listing.exterior_color}" → "${normalized}"`);
        }
      }

      // Check interior color
      if (listing.interior_color && needsNormalization(listing.interior_color)) {
        const normalized = normalizeColor(listing.interior_color);
        if (normalized && normalized !== listing.interior_color) {
          updates.interior_color = normalized;
          needsUpdate = true;
          interiorNormalized++;
          console.log(`  🪑 Interior: "${listing.interior_color}" → "${normalized}"`);
        }
      }

      // Update if needed
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('listings')
          .update(updates)
          .eq('id', listing.id);

        if (updateError) {
          console.error(`  ❌ Error updating listing ${listing.id}:`, updateError);
          errors++;
        }
      } else {
        skipped++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Color Normalization Complete!');
  console.log('='.repeat(60));
  console.log(`📊 Summary:`);
  console.log(`  • Exterior colors normalized: ${exteriorNormalized}`);
  console.log(`  • Interior colors normalized: ${interiorNormalized}`);
  console.log(`  • Listings skipped (no changes): ${skipped}`);
  console.log(`  • Errors: ${errors}`);
  console.log(`  • Total processed: ${listings?.length || 0}`);
}

// Run the normalization
normalizeExistingColors()
  .then(() => console.log('\n✅ Color normalization completed successfully!'))
  .catch(console.error);