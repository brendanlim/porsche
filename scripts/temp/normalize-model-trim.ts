import { createClient } from '@supabase/supabase-js';
import { formatModelName } from '../../lib/utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function normalizeAllModelTrim() {
  console.log('Fetching all listings...');

  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, model, trim')
    .not('model', 'is', null);

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${listings.length} listings to normalize`);

  let updated = 0;
  let skipped = 0;

  for (const listing of listings) {
    const normalizedModel = listing.model ? formatModelName(listing.model) : listing.model;
    const normalizedTrim = listing.trim ? formatModelName(listing.trim) : listing.trim;

    // Check if anything changed
    if (normalizedModel !== listing.model || normalizedTrim !== listing.trim) {
      const { error: updateError } = await supabase
        .from('listings')
        .update({
          model: normalizedModel,
          trim: normalizedTrim
        })
        .eq('id', listing.id);

      if (updateError) {
        console.error(`Error updating ${listing.id}:`, updateError);
      } else {
        updated++;
        if (updated % 100 === 0) {
          console.log(`Updated ${updated} listings...`);
        }
      }
    } else {
      skipped++;
    }
  }

  console.log(`\nDone!`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (already normalized): ${skipped}`);
}

normalizeAllModelTrim();
