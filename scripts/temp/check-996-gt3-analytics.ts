import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkGT3Analytics() {
  // Check what 996 GT3 (non-RS) we have with sold dates
  const { data } = await supabase
    .from('listings')
    .select('year, generation, trim, price, sold_date, source')
    .eq('model', '911')
    .eq('trim', 'GT3')  // Just regular GT3, not RS
    .eq('generation', '996')
    .not('sold_date', 'is', null)  // Must have sold date (like analytics)
    .order('year');

  console.log('996 GT3 (non-RS) with sold_date:');
  console.log('=================================');

  const byYear: Record<number, any[]> = {};
  data?.forEach(l => {
    const year = l.year || 0;
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(l);
  });

  Object.entries(byYear).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([year, listings]) => {
    console.log(`\nYear ${year}: ${listings.length} listings`);
    const avgPrice = Math.round(listings.reduce((sum, l) => sum + (l.price || 0), 0) / listings.length);
    console.log(`  Avg price: $${avgPrice.toLocaleString()}`);

    // Show sample sold dates
    const soldDates = listings.slice(0, 3).map(l => l.sold_date?.split('T')[0]).filter(Boolean);
    if (soldDates.length > 0) {
      console.log(`  Sample sold dates: ${soldDates.join(', ')}`);
    }
  });

  // Check without sold_date filter
  const { data: allData } = await supabase
    .from('listings')
    .select('year, sold_date')
    .eq('model', '911')
    .eq('trim', 'GT3')
    .eq('generation', '996')
    .order('year');

  console.log('\n996 GT3 sold_date status by year:');
  console.log('==================================');

  const soldDateStats: Record<number, { withDate: number; withoutDate: number }> = {};
  allData?.forEach(l => {
    const year = l.year || 0;
    if (!soldDateStats[year]) {
      soldDateStats[year] = { withDate: 0, withoutDate: 0 };
    }
    if (l.sold_date) {
      soldDateStats[year].withDate++;
    } else {
      soldDateStats[year].withoutDate++;
    }
  });

  Object.entries(soldDateStats).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([year, stats]) => {
    const total = stats.withDate + stats.withoutDate;
    console.log(`  Year ${year}: ${stats.withDate}/${total} have sold_date (${Math.round(stats.withDate/total*100)}%)`);
  });

  // Check recent sales (last 2 years like default analytics)
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const { data: recentData } = await supabase
    .from('listings')
    .select('year, sold_date')
    .eq('model', '911')
    .eq('trim', 'GT3')
    .eq('generation', '996')
    .not('sold_date', 'is', null)
    .gte('sold_date', twoYearsAgo.toISOString());

  console.log(`\n996 GT3 sold in last 2 years (after ${twoYearsAgo.toISOString().split('T')[0]}):`);
  console.log('=============================');
  const recentByYear: Record<number, number> = {};
  recentData?.forEach(l => {
    const year = l.year || 0;
    recentByYear[year] = (recentByYear[year] || 0) + 1;
  });

  Object.entries(recentByYear).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([year, count]) => {
    console.log(`  Year ${year}: ${count} listings`);
  });

  if (Object.keys(recentByYear).length === 1 && recentByYear[2004]) {
    console.log('\n⚠️  Only 2004 996 GT3s were sold in the last 2 years!');
    console.log('Other years may have older sold_dates or no sold_date.');
  }

  // Check ALL years default filter (what analytics uses by default)
  console.log('\n996 GT3 with "all" time filter (no date restriction):');
  console.log('=====================================================');
  const allTimeByYear: Record<number, number> = {};
  data?.forEach(l => {
    const year = l.year || 0;
    allTimeByYear[year] = (allTimeByYear[year] || 0) + 1;
  });

  Object.entries(allTimeByYear).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([year, count]) => {
    console.log(`  Year ${year}: ${count} listings`);
  });
}

checkGT3Analytics().catch(console.error);