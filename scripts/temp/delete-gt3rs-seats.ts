import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteGT3RSSeats() {
  console.log('🗑️ Deleting invalid GT3 RS seat listings...\n');

  // IDs of the seat listings to delete
  const seatListingIds = [
    '4f4e701d-7ea1-48e0-a517-40e262759bd1', // $17,250 992 GT3 RS Weissach Seats
    '8646b0e2-4c1e-4c1e-b6e7-e75aa592d49b', // $19,000 992 GT3 RS Weissach Seats
    'f301e792-99ba-4eb8-8f3a-3abba4e3834b'  // $21,525 997 GT3 Lightweight Seats
  ];

  for (const id of seatListingIds) {
    console.log(`Deleting listing ${id}...`);

    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`❌ Error deleting ${id}:`, error);
    } else {
      console.log(`✅ Successfully deleted ${id}`);
    }
  }

  console.log('\n✨ Cleanup complete! All GT3 RS seat listings have been removed.');
  console.log('These were parts listings (seats only), not complete cars.');
}

deleteGT3RSSeats().catch(console.error);