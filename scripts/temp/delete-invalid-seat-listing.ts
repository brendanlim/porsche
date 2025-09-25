import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteInvalidSeatListing() {
  const listingId = '4ea0973e-4867-4f12-a2ec-2d6d77245179';

  console.log('Deleting invalid seat listing that was incorrectly marked as a GT4 car...\n');
  console.log(`Listing ID: ${listingId}`);
  console.log(`Title: "Porsche Cayman GT4 Lightweight Bucket Seats"`);
  console.log(`Price: $17,750 (for seats, not a car)`);
  console.log(`URL: https://bringatrailer.com/listing/seats-94/`);
  console.log('\nThis is a listing for racing seats, not an actual GT4 car.');
  console.log('Deleting from database...\n');

  // Delete from listings table
  const { error: deleteError } = await supabase
    .from('listings')
    .delete()
    .eq('id', listingId);

  if (deleteError) {
    console.error('Error deleting listing:', deleteError);
    return;
  }

  console.log('✅ Successfully deleted invalid seat listing from database');

  // Also delete any cached HTML if it exists
  const { error: cacheDeleteError } = await supabase
    .from('raw_html_cache')
    .delete()
    .eq('listing_id', listingId);

  if (!cacheDeleteError) {
    console.log('✅ Also cleaned up any cached HTML for this listing');
  }

  // Verify deletion
  const { data: checkData, error: checkError } = await supabase
    .from('listings')
    .select('id')
    .eq('id', listingId)
    .single();

  if (checkError?.code === 'PGRST116') {
    console.log('\n✅ Confirmed: Listing no longer exists in database');
  } else if (checkData) {
    console.error('⚠️ Warning: Listing still exists in database');
  }
}

deleteInvalidSeatListing().catch(console.error);