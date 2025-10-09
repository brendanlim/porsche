import { supabaseAdmin } from '../../lib/supabase/admin';

async function analyzeAppreciationData() {
  console.log('Analyzing data for appreciation calculations...\n');

  // Get date range of sold listings
  const { data: dateRange } = await supabaseAdmin
    .from('listings')
    .select('sold_date, created_at, price, model, trim')
    .not('sold_date', 'is', null)
    .order('sold_date', { ascending: true });

  if (!dateRange || dateRange.length === 0) {
    console.log('No sold listings found!');
    return;
  }

  const earliest = dateRange[0].sold_date;
  const latest = dateRange[dateRange.length - 1].sold_date;

  console.log(`Total sold listings: ${dateRange.length}`);
  console.log(`Date range: ${earliest} to ${latest}`);
  console.log(`Span: ${Math.round((new Date(latest).getTime() - new Date(earliest).getTime()) / (1000 * 60 * 60 * 24))} days\n`);

  // Calculate how many listings we have per year
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const listingsLastYear = dateRange.filter(l => new Date(l.sold_date) > oneYearAgo);

  console.log(`Listings in last 12 months: ${listingsLastYear.length}\n`);

  // Group by model/trim to see what we have
  const trimGroups = new Map<string, any[]>();
  dateRange.forEach(listing => {
    const key = `${listing.model} ${listing.trim}`;
    if (!trimGroups.has(key)) {
      trimGroups.set(key, []);
    }
    trimGroups.get(key)!.push(listing);
  });

  console.log('Top 10 trims by sold listing count:');
  const sorted = Array.from(trimGroups.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);

  sorted.forEach(([trim, listings]) => {
    const prices = listings.map(l => l.price).filter(p => p > 0);
    const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    const dates = listings.map(l => l.sold_date).sort();
    const span = Math.round((new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) / (1000 * 60 * 60 * 24));

    console.log(`  ${trim}: ${listings.length} sold, avg $${avgPrice.toLocaleString()}, ${span} day span`);
  });

  // Sample one trim to show how we could calculate YoY
  console.log('\n\nSample YoY calculation for 911 GT3:');
  const gt3Listings = trimGroups.get('911 GT3') || [];
  if (gt3Listings.length > 0) {
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const recent = gt3Listings.filter(l => new Date(l.sold_date) > oneYearAgo && new Date(l.sold_date) <= now);
    const older = gt3Listings.filter(l => new Date(l.sold_date) > twoYearsAgo && new Date(l.sold_date) <= oneYearAgo);

    const recentPrices = recent.map(l => l.price).filter(p => p > 0);
    const olderPrices = older.map(l => l.price).filter(p => p > 0);

    if (recentPrices.length > 0 && olderPrices.length > 0) {
      const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
      const olderAvg = olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length;
      const appreciation = ((recentAvg - olderAvg) / olderAvg) * 100;

      console.log(`  Last 12 months: ${recentPrices.length} sales, avg $${Math.round(recentAvg).toLocaleString()}`);
      console.log(`  Previous 12 months: ${olderPrices.length} sales, avg $${Math.round(olderAvg).toLocaleString()}`);
      console.log(`  YoY Change: ${appreciation > 0 ? '+' : ''}${appreciation.toFixed(1)}%`);
    } else {
      console.log('  Not enough data for YoY comparison');
    }
  }
}

analyzeAppreciationData();
