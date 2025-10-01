import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function analyzeVins() {
  console.log('Analyzing VINs in database...\n');

  // Total count
  const { count: totalCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true });
  console.log(`Total listings: ${totalCount}`);

  // Unique VINs
  const { data: uniqueVins, error: vinError } = await supabase
    .from('listings')
    .select('vin');

  if (vinError) {
    console.error('Error fetching VINs:', vinError);
    return;
  }

  const uniqueVinSet = new Set(uniqueVins.map(v => v.vin));
  console.log(`Unique VINs: ${uniqueVinSet.size}`);
  console.log(`Duplicates: ${totalCount! - uniqueVinSet.size}\n`);

  // Check for missing data
  const { count: missingSoldDate } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .is('sold_date', null);

  const { count: missingColor } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .is('color', null);

  const { count: missingMileage } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .is('mileage', null);

  const { count: missingPrice } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .is('price', null);

  console.log('Missing data:');
  console.log(`- No sold_date: ${missingSoldDate}`);
  console.log(`- No color: ${missingColor}`);
  console.log(`- No mileage: ${missingMileage}`);
  console.log(`- No price: ${missingPrice}\n`);

  // Check sources
  const { data: sources } = await supabase
    .from('listings')
    .select('source')
    .not('source', 'is', null);

  const sourceCounts = sources?.reduce((acc, item) => {
    acc[item.source] = (acc[item.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('Listings by source:');
  Object.entries(sourceCounts || {}).forEach(([source, count]) => {
    console.log(`- ${source}: ${count}`);
  });

  // Check recent additions (last 24 hours)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const { count: recentCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .gte('scraped_at', yesterday.toISOString());

  console.log(`\nListings added in last 24 hours: ${recentCount}`);

  // Check for VINs with multiple listings
  const { data: allListings } = await supabase
    .from('listings')
    .select('vin, source, sold_date, price')
    .order('vin');

  const vinGroups = allListings?.reduce((acc, item) => {
    if (!acc[item.vin]) acc[item.vin] = [];
    acc[item.vin].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const duplicateVins = Object.entries(vinGroups || {})
    .filter(([_, listings]) => listings.length > 1)
    .slice(0, 5);

  if (duplicateVins.length > 0) {
    console.log('\nExample duplicate VINs (first 5):');
    duplicateVins.forEach(([vin, listings]) => {
      console.log(`\nVIN: ${vin} (${listings.length} entries)`);
      listings.forEach(l => {
        console.log(`  - ${l.source}: $${l.price} on ${l.sold_date || 'no date'}`);
      });
    });
  }
}

analyzeVins().catch(console.error);