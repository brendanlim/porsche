import { supabaseAdmin } from '@/lib/supabase/admin';

async function debugMoMCalculation() {
  console.log('Debugging MoM calculation for GT4 RS...\n');

  // Get all GT4 RS listings
  const { data: allListings, error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .or(`model.ilike.%718%,model.ilike.%cayman%`)
    .or(`trim.ilike.%gt4-rs%,trim.ilike.%gt4 rs%`)
    .not('sold_date', 'is', null)
    .gte('price', 175000)  // Min price for GT4 RS
    .order('sold_date', { ascending: false });

  if (error || !allListings || allListings.length === 0) {
    console.error('Error fetching listings or no data found');
    return;
  }

  // Sort by date
  const sortedByDate = allListings
    .filter(l => l.sold_date)
    .sort((a, b) => new Date(b.sold_date).getTime() - new Date(a.sold_date).getTime());

  console.log(`Most recent sale date: ${sortedByDate[0].sold_date}`);
  console.log(`Oldest sale date: ${sortedByDate[sortedByDate.length - 1].sold_date}\n`);

  // Use most recent sale date as reference
  const mostRecentDate = new Date(sortedByDate[0].sold_date);
  const monthBefore = new Date(mostRecentDate);
  monthBefore.setMonth(monthBefore.getMonth() - 1);
  const twoMonthsBefore = new Date(mostRecentDate);
  twoMonthsBefore.setMonth(twoMonthsBefore.getMonth() - 2);

  console.log(`Date ranges for MoM calculation:`);
  console.log(`Current month: ${monthBefore.toISOString().split('T')[0]} to ${mostRecentDate.toISOString().split('T')[0]}`);
  console.log(`Previous month: ${twoMonthsBefore.toISOString().split('T')[0]} to ${monthBefore.toISOString().split('T')[0]}\n`);

  // Get listings for each period
  const currentMonthListings = sortedByDate.filter(l =>
    l.sold_date && new Date(l.sold_date) > monthBefore && new Date(l.sold_date) <= mostRecentDate
  );
  const prevMonthListings = sortedByDate.filter(l =>
    l.sold_date && new Date(l.sold_date) > twoMonthsBefore && new Date(l.sold_date) <= monthBefore
  );

  console.log(`Current month listings: ${currentMonthListings.length}`);
  if (currentMonthListings.length > 0) {
    console.log('Current month sales:');
    currentMonthListings.forEach(l => {
      console.log(`  ${l.sold_date?.split('T')[0]}: $${(l.sold_price || l.price).toLocaleString()}`);
    });
    const avg = currentMonthListings.reduce((sum, l) => sum + (l.sold_price || l.price), 0) / currentMonthListings.length;
    console.log(`  Average: $${avg.toFixed(0)}\n`);
  }

  console.log(`Previous month listings: ${prevMonthListings.length}`);
  if (prevMonthListings.length > 0) {
    console.log('Previous month sales:');
    prevMonthListings.forEach(l => {
      console.log(`  ${l.sold_date?.split('T')[0]}: $${(l.sold_price || l.price).toLocaleString()}`);
    });
    const avg = prevMonthListings.reduce((sum, l) => sum + (l.sold_price || l.price), 0) / prevMonthListings.length;
    console.log(`  Average: $${avg.toFixed(0)}\n`);
  }

  // Calculate MoM if we have data
  if (currentMonthListings.length > 0 && prevMonthListings.length > 0) {
    const currentMonthAvg = currentMonthListings.reduce((sum, l) => sum + (l.sold_price || l.price), 0) / currentMonthListings.length;
    const prevMonthAvg = prevMonthListings.reduce((sum, l) => sum + (l.sold_price || l.price), 0) / prevMonthListings.length;
    const momAppreciation = ((currentMonthAvg - prevMonthAvg) / prevMonthAvg) * 100;
    console.log(`✅ MoM Appreciation: ${momAppreciation.toFixed(2)}%`);
  } else {
    console.log(`❌ Cannot calculate MoM: Insufficient data in one or both periods`);
  }

  // Also check week-over-week for comparison
  const weekBefore = new Date(mostRecentDate);
  weekBefore.setDate(weekBefore.getDate() - 7);
  const twoWeeksBefore = new Date(mostRecentDate);
  twoWeeksBefore.setDate(twoWeeksBefore.getDate() - 14);

  const currentWeekListings = sortedByDate.filter(l =>
    l.sold_date && new Date(l.sold_date) > weekBefore && new Date(l.sold_date) <= mostRecentDate
  );
  const prevWeekListings = sortedByDate.filter(l =>
    l.sold_date && new Date(l.sold_date) > twoWeeksBefore && new Date(l.sold_date) <= weekBefore
  );

  console.log(`\nWoW Debug:`);
  console.log(`Current week: ${weekBefore.toISOString().split('T')[0]} to ${mostRecentDate.toISOString().split('T')[0]} (${currentWeekListings.length} listings)`);
  console.log(`Previous week: ${twoWeeksBefore.toISOString().split('T')[0]} to ${weekBefore.toISOString().split('T')[0]} (${prevWeekListings.length} listings)`);

  if (currentWeekListings.length > 0 && prevWeekListings.length > 0) {
    const currentWeekAvg = currentWeekListings.reduce((sum, l) => sum + (l.sold_price || l.price), 0) / currentWeekListings.length;
    const prevWeekAvg = prevWeekListings.reduce((sum, l) => sum + (l.sold_price || l.price), 0) / prevWeekListings.length;
    const wowAppreciation = ((currentWeekAvg - prevWeekAvg) / prevWeekAvg) * 100;
    console.log(`✅ WoW Appreciation: ${wowAppreciation.toFixed(2)}%`);
  }

  process.exit(0);
}

debugMoMCalculation().catch(console.error);