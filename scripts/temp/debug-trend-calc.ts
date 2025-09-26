import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugTrendCalculation() {
  console.log('Debugging trend calculation for 718 Cayman GT4 RS...\n');

  // Get all GT4 RS listings with sold dates
  const { data: listings, error } = await supabase
    .from('listings')
    .select('sold_date, price, mileage, vin')
    .ilike('model', '718 cayman')
    .ilike('trim', 'gt4 rs')
    .not('sold_date', 'is', null)
    .gte('price', 175000) // Min price filter from the API
    .order('sold_date', { ascending: false });

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${listings?.length || 0} total listings\n`);

  if (!listings || listings.length === 0) {
    console.log('No listings found!');
    return;
  }

  // Get the most recent date
  const mostRecentDate = new Date(listings[0].sold_date);
  console.log(`Most recent sale: ${mostRecentDate.toISOString().split('T')[0]}`);
  console.log(`Oldest sale: ${listings[listings.length - 1].sold_date}\n`);

  // Calculate date ranges (matching the UPDATED API logic with wider windows)
  const now = mostRecentDate;
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  // Updated 3-month window
  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const fourMonthsAgo = new Date(now);
  fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

  // Updated 6-month window
  const fiveMonthsAgo = new Date(now);
  fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
  const sevenMonthsAgo = new Date(now);
  sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

  // Get recent month listings
  const recentMonthListings = listings.filter(l => {
    const soldDate = new Date(l.sold_date);
    return soldDate > oneMonthAgo && soldDate <= mostRecentDate;
  });

  // Get 3 months ago listings (WIDER WINDOW)
  const threeMonthAgoListings = listings.filter(l => {
    const soldDate = new Date(l.sold_date);
    return soldDate >= fourMonthsAgo && soldDate <= twoMonthsAgo;
  });

  // Get 6 months ago listings (WIDER WINDOW)
  const sixMonthAgoListings = listings.filter(l => {
    const soldDate = new Date(l.sold_date);
    return soldDate >= sevenMonthsAgo && soldDate <= fiveMonthsAgo;
  });

  console.log('Listing counts by period (WITH WIDER WINDOWS):');
  console.log(`Recent month (${oneMonthAgo.toISOString().split('T')[0]} to ${mostRecentDate.toISOString().split('T')[0]}): ${recentMonthListings.length} listings`);
  console.log(`3 months ago (${fourMonthsAgo.toISOString().split('T')[0]} to ${twoMonthsAgo.toISOString().split('T')[0]}): ${threeMonthAgoListings.length} listings`);
  console.log(`6 months ago (${sevenMonthsAgo.toISOString().split('T')[0]} to ${fiveMonthsAgo.toISOString().split('T')[0]}): ${sixMonthAgoListings.length} listings`);

  // Calculate 6-month trend
  console.log('\n6-Month Trend Calculation:');
  if (recentMonthListings.length > 0 && sixMonthAgoListings.length > 0) {
    const recentPrices = recentMonthListings.map(l => l.price).sort((a, b) => a - b);
    const recentMedian = recentPrices[Math.floor(recentPrices.length / 2)];

    const sixMonthAgoPrices = sixMonthAgoListings.map(l => l.price).sort((a, b) => a - b);
    const sixMonthAgoMedian = sixMonthAgoPrices[Math.floor(sixMonthAgoPrices.length / 2)];

    const trend = ((recentMedian - sixMonthAgoMedian) / sixMonthAgoMedian) * 100;

    console.log(`Recent median: $${recentMedian.toLocaleString()}`);
    console.log(`6 months ago median: $${sixMonthAgoMedian.toLocaleString()}`);
    console.log(`Calculated trend: ${trend.toFixed(2)}%`);
  } else {
    console.log('Not enough data for direct comparison');
    console.log('Will try fallback logic...');

    // Try fallback
    const oldDate = new Date(mostRecentDate);
    oldDate.setMonth(oldDate.getMonth() - 8);

    const olderListings = listings.filter(l => {
      const soldDate = new Date(l.sold_date);
      return soldDate < sixMonthsAgo && soldDate > oldDate;
    });

    console.log(`\nFallback: Found ${olderListings.length} older listings (${oldDate.toISOString().split('T')[0]} to ${sixMonthsAgo.toISOString().split('T')[0]})`);

    if (recentMonthListings.length > 0 && olderListings.length > 0) {
      const recentPrices = recentMonthListings.map(l => l.price).sort((a, b) => a - b);
      const recentMedian = recentPrices[Math.floor(recentPrices.length / 2)];

      const olderPrices = olderListings.map(l => l.price).sort((a, b) => a - b);
      const olderMedian = olderPrices[Math.floor(olderPrices.length / 2)];

      // Calculate time difference
      const avgOlderDate = new Date(
        olderListings.reduce((sum, l) => sum + new Date(l.sold_date).getTime(), 0) / olderListings.length
      );
      const monthsDiff = (mostRecentDate.getTime() - avgOlderDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

      const totalTrend = ((recentMedian - olderMedian) / olderMedian) * 100;
      const sixMonthTrend = (totalTrend / monthsDiff) * 6;

      console.log(`Recent median: $${recentMedian.toLocaleString()}`);
      console.log(`Older median: $${olderMedian.toLocaleString()}`);
      console.log(`Months difference: ${monthsDiff.toFixed(1)}`);
      console.log(`Total trend: ${totalTrend.toFixed(2)}%`);
      console.log(`Scaled 6-month trend: ${sixMonthTrend.toFixed(2)}%`);
    }
  }

  // Group by month to see the data distribution
  console.log('\n\nListings by month:');
  const monthGroups = new Map();
  listings.forEach(l => {
    const month = l.sold_date.substring(0, 7);
    if (!monthGroups.has(month)) {
      monthGroups.set(month, { count: 0, prices: [] });
    }
    const group = monthGroups.get(month);
    group.count++;
    group.prices.push(l.price);
  });

  Array.from(monthGroups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12)
    .forEach(([month, data]) => {
      const median = data.prices.sort((a: number, b: number) => a - b)[Math.floor(data.prices.length / 2)];
      console.log(`  ${month}: ${data.count} listings, median: $${median.toLocaleString()}`);
    });
}

debugTrendCalculation();