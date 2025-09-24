/**
 * Quick database check script
 */

import { createClient } from '@supabase/supabase-js';

async function checkDatabase() {
  // Load environment variables
  try {
    const dotenv = await import('dotenv');
    dotenv.config({ path: '.env.local' });
  } catch (error) {
    console.log('Running in production environment');
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔍 Checking database structure...');

  // Check if active_listings view exists and has data
  const activeListings = await supabase.from('active_listings').select('*').limit(5);
  console.log('Active listings result:', activeListings);
  console.log('Active listings sample:', activeListings.data?.length || 0, 'records');

  // Check raw listings table
  const listings = await supabase.from('listings').select('*').limit(5);
  console.log('Raw listings sample:', listings.data?.length || 0, 'records');

  // Check for VINs in listings
  const vinsCount = await supabase.from('listings').select('vin').not('vin', 'is', null).limit(10);
  console.log('Listings with VINs sample:', vinsCount.data?.length || 0, 'records');

  if (vinsCount.data && vinsCount.data.length > 0) {
    console.log('Sample VINs:', vinsCount.data.map(r => r.vin));
  }

  // Check the views available
  const tablesQuery = await supabase.rpc('show_tables_and_views');
  console.log('Tables/views query result:', tablesQuery);
}

checkDatabase();