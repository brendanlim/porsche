import { supabaseAdmin } from '../../lib/supabase/admin';

async function analyzeActiveListings() {
  const { data: activeListings } = await supabaseAdmin
    .from('listings')
    .select('id, vin, model, trim, source, url, created_at, scraped_at, sold_date, status, price')
    .is('sold_date', null)
    .order('scraped_at', { ascending: false })
    .limit(20);

  console.log(`Total "active" listings (sold_date is null):\n`);

  const { count } = await supabaseAdmin
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .is('sold_date', null);

  console.log(`Total: ${count}\n`);

  // Group by source
  const { data: bySource } = await supabaseAdmin
    .from('listings')
    .select('source')
    .is('sold_date', null);

  const sourceGroups = new Map<string, number>();
  bySource?.forEach(l => {
    sourceGroups.set(l.source, (sourceGroups.get(l.source) || 0) + 1);
  });

  console.log('By source:');
  Array.from(sourceGroups.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, count]) => {
      console.log(`  ${source}: ${count}`);
    });

  console.log('\n\nSample of 20 most recent "active" listings:');
  console.log('='.repeat(100));

  activeListings?.forEach((listing, idx) => {
    console.log(`\n${idx + 1}. ${listing.model} ${listing.trim} - $${listing.price?.toLocaleString()}`);
    console.log(`   VIN: ${listing.vin}`);
    console.log(`   Source: ${listing.source}`);
    console.log(`   Status: ${listing.status}`);
    console.log(`   Scraped: ${listing.scraped_at}`);
    console.log(`   URL: ${listing.url}`);
  });

  // Check if any have a status field that indicates they're sold
  const { data: withStatus } = await supabaseAdmin
    .from('listings')
    .select('status, sold_date')
    .is('sold_date', null)
    .not('status', 'is', null);

  console.log('\n\nStatus field values for "active" listings:');
  const statusGroups = new Map<string, number>();
  withStatus?.forEach(l => {
    statusGroups.set(l.status || 'null', (statusGroups.get(l.status || 'null') || 0) + 1);
  });

  Array.from(statusGroups.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
}

analyzeActiveListings();
