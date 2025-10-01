import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function countDeletions() {
  console.log('Counting listings to be deleted...\n');

  // Count listings without VIN
  const { count: noVin } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .is('vin', null);

  // Count listings without sold_date
  const { count: noSoldDate } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .is('sold_date', null);

  // Count listings without mileage
  const { count: noMileage } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .is('mileage', null);

  // Count listings with ANY of these issues (using OR)
  const { data: toDelete, error } = await supabase
    .from('listings')
    .select('id, vin, sold_date, mileage')
    .or('vin.is.null,sold_date.is.null,mileage.is.null');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const uniqueIds = new Set(toDelete.map(item => item.id));

  console.log('Listings to be deleted:');
  console.log(`- No VIN: ${noVin} listings`);
  console.log(`- No sold_date: ${noSoldDate} listings`);
  console.log(`- No mileage: ${noMileage} listings`);
  console.log(`\nTOTAL unique listings to delete: ${uniqueIds.size}`);

  // Current total
  const { count: currentTotal } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true });

  console.log(`\nCurrent total: ${currentTotal}`);
  console.log(`After deletion: ${currentTotal! - uniqueIds.size}`);
}

countDeletions().catch(console.error);