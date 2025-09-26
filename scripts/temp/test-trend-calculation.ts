import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testTrendCalculation() {
  console.log('Testing trend calculation for 718 Cayman GT4 RS...\n');

  try {
    // Test the API endpoint
    const response = await fetch('http://localhost:3000/api/analytics/718-cayman/gt4-rs?range=1y');
    const data = await response.json();

    console.log('Analytics Response:');
    console.log('==================');
    console.log(`Total Listings: ${data.totalListings}`);
    console.log(`Average Price: $${data.averagePrice?.toLocaleString()}`);
    console.log('\nTrend Values:');
    console.log(`3-Month Trend (wowAppreciation): ${data.wowAppreciation?.toFixed(2)}%`);
    console.log(`6-Month Trend (momAppreciation): ${data.momAppreciation?.toFixed(2)}%`);
    console.log(`1-Year Trend (yoyAppreciation): ${data.yoyAppreciation?.toFixed(2)}%`);

    if (data.threeMonthTrend !== undefined) {
      console.log(`\nNew Trend Fields:`);
      console.log(`threeMonthTrend: ${data.threeMonthTrend?.toFixed(2)}%`);
      console.log(`sixMonthTrend: ${data.sixMonthTrend?.toFixed(2)}%`);
      console.log(`oneYearTrend: ${data.oneYearTrend?.toFixed(2)}%`);
    }

    // Also check raw data to understand what's available
    const { data: listings, error } = await supabase
      .from('listings')
      .select('sold_date, price, mileage')
      .ilike('model', '718 cayman')
      .ilike('trim', 'gt4 rs')
      .not('sold_date', 'is', null)
      .order('sold_date', { ascending: false })
      .limit(20);

    if (!error && listings) {
      console.log(`\nRecent Sales Data (${listings.length} listings):`);
      console.log('Date Range:', listings[listings.length - 1]?.sold_date, 'to', listings[0]?.sold_date);

      // Group by month to see data availability
      const monthCounts = new Map();
      listings.forEach(l => {
        const month = l.sold_date.substring(0, 7);
        monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
      });

      console.log('\nListings by Month:');
      Array.from(monthCounts.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .forEach(([month, count]) => {
          console.log(`  ${month}: ${count} listings`);
        });
    }

  } catch (error) {
    console.error('Error testing trend calculation:', error);
  }
}

testTrendCalculation();