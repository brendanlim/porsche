import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function updateClubsportListings() {
  console.log('Updating GT4 Clubsport Listings');
  console.log('================================\n');

  // Find all listings with WP0ZZZ prefix (Clubsport/racing cars)
  const { data: clubsportListings } = await supabase
    .from('listings')
    .select('id, title, vin, trim')
    .like('vin', 'WP0ZZZ%')
    .eq('model', '718 Cayman');

  console.log(`Found ${clubsportListings?.length || 0} potential Clubsport listings with WP0ZZZ VIN prefix\n`);

  let updateCount = 0;
  for (const listing of clubsportListings || []) {
    if (listing.title?.includes('Clubsport') || listing.vin?.substring(6, 8) === '98') {
      const { error } = await supabase
        .from('listings')
        .update({
          trim: 'GT4 Clubsport',
          updated_at: new Date().toISOString()
        })
        .eq('id', listing.id);

      if (!error) {
        updateCount++;
        console.log(`  ✅ Updated: ${listing.title?.substring(0, 60)}...`);
      } else {
        console.error(`  ❌ Failed to update ${listing.id}: ${error.message}`);
      }
    }
  }

  // Also check for any listings with "Clubsport" in title but different VIN pattern
  const { data: titleClubsport } = await supabase
    .from('listings')
    .select('id, title, vin, trim')
    .ilike('title', '%clubsport%')
    .eq('model', '718 Cayman')
    .neq('trim', 'GT4 Clubsport');

  console.log(`\nFound ${titleClubsport?.length || 0} listings with "Clubsport" in title but wrong trim`);

  for (const listing of titleClubsport || []) {
    const { error } = await supabase
      .from('listings')
      .update({
        trim: 'GT4 Clubsport',
        updated_at: new Date().toISOString()
      })
      .eq('id', listing.id);

    if (!error) {
      updateCount++;
      console.log(`  ✅ Updated: ${listing.title?.substring(0, 60)}...`);
    }
  }

  console.log(`\n✅ Total updated: ${updateCount} listings to GT4 Clubsport`);
}

updateClubsportListings().catch(console.error);