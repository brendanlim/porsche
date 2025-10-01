import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function deleteIncompleteListings() {
  console.log('Starting deletion of incomplete listings...\n');

  // Delete listings without VIN, sold_date, or mileage
  const { data: deleted, error } = await supabase
    .from('listings')
    .delete()
    .or('vin.is.null,sold_date.is.null,mileage.is.null')
    .select();

  if (error) {
    console.error('Error deleting listings:', error);
    return;
  }

  console.log(`Successfully deleted ${deleted?.length || 0} listings`);

  // Verify new totals
  const { count: newTotal } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true });

  const { count: uniqueVins } = await supabase
    .from('listings')
    .select('vin', { count: 'exact' });

  console.log(`\nNew database stats:`);
  console.log(`- Total listings: ${newTotal}`);
  console.log(`- Listings with complete data: ${newTotal}`);
}

deleteIncompleteListings().catch(console.error);