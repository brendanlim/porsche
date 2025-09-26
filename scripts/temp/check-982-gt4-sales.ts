import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function check982GT4Sales() {
  console.log('Checking for 982 GT4 sales data...\n');

  // Get all 982 GT4s
  const { data: allGT4s, error } = await supabase
    .from('listings')
    .select('*')
    .eq('model', '718')
    .ilike('trim', '%gt4%')
    .eq('generation', '982');

  console.log('Total 982 GT4 listings:', allGT4s?.length || 0);

  if (allGT4s && allGT4s.length > 0) {
    // Check how many have sold dates
    const soldListings = allGT4s.filter(l => l.sold_date);
    console.log('Sold listings:', soldListings.length);
    console.log('Active/Unsold listings:', allGT4s.length - soldListings.length);

    if (soldListings.length > 0) {
      console.log('\nSold listings details:');
      soldListings.forEach(listing => {
        console.log(`  - ${listing.year} ${listing.model} ${listing.trim} - $${listing.price} - Sold: ${listing.sold_date}`);
      });

      // Check date ranges for trend analysis
      const now = new Date();
      const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
      const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
      const oneYearAgo = new Date(now.setMonth(now.getMonth() - 6));

      const recent3Months = soldListings.filter(l => new Date(l.sold_date) >= threeMonthsAgo).length;
      const recent6Months = soldListings.filter(l => new Date(l.sold_date) >= sixMonthsAgo).length;
      const recentYear = soldListings.filter(l => new Date(l.sold_date) >= oneYearAgo).length;

      console.log('\nSales by time period:');
      console.log(`  - Last 3 months: ${recent3Months}`);
      console.log(`  - Last 6 months: ${recent6Months}`);
      console.log(`  - Last year: ${recentYear}`);

      console.log('\n⚠️  ISSUE: Need at least 10 sold listings in the past year for narrative generation');
      console.log(`   Current: ${recentYear} sold in past year`);
    } else {
      console.log('\n❌ NO SOLD LISTINGS - Cannot generate narratives without sales data!');
      console.log('   All GT4 listings are currently active/unsold');
    }

    // Show all listings for context
    console.log('\nAll 982 GT4 listings:');
    allGT4s.slice(0, 10).forEach(listing => {
      console.log(`  - ${listing.year} ${listing.model} ${listing.trim} - $${listing.price} - ${listing.sold_date ? 'SOLD: ' + listing.sold_date : 'ACTIVE'}`);
    });
  }

  // Check for other 718 models that might have sales
  console.log('\n=== Checking other 718 models with sales ===');
  const { data: other718s } = await supabase
    .from('listings')
    .select('trim, generation, sold_date')
    .eq('model', '718')
    .not('sold_date', 'is', null)
    .limit(20);

  if (other718s && other718s.length > 0) {
    const trimCounts: Record<string, number> = {};
    other718s.forEach(l => {
      const key = `${l.trim} (Gen ${l.generation})`;
      trimCounts[key] = (trimCounts[key] || 0) + 1;
    });
    console.log('Other 718 models with sales:', trimCounts);
  } else {
    console.log('No other 718 models have sales data');
  }
}

check982GT4Sales();