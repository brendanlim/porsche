import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkData() {
  // Check how much data we have for 911 GT3
  const { data: listings, error } = await supabase
    .from('listings')
    .select('model, trim, price, sold_date, scraped_at')
    .ilike('model', '%911%')
    .ilike('trim', '%GT3%')
    .not('sold_date', 'is', null)
    .limit(10);

  console.log('Sample 911 GT3 listings with sold_date:');
  console.log(listings);

  // Count total
  const { count } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .ilike('model', '%911%')
    .ilike('trim', '%GT3%')
    .not('sold_date', 'is', null);

  console.log('\nTotal 911 GT3 listings with sold_date:', count);

  // Check monthly distribution
  if (listings && listings.length > 0) {
    const { data: monthlyData } = await supabase
      .from('listings')
      .select('sold_date, price')
      .ilike('model', '%911%')
      .ilike('trim', '%GT3%')
      .not('sold_date', 'is', null);

    if (monthlyData) {
      const monthCounts = new Map<number, { count: number; totalPrice: number }>();
      monthlyData.forEach(listing => {
        const month = new Date(listing.sold_date).getMonth();
        const current = monthCounts.get(month) || { count: 0, totalPrice: 0 };
        current.count++;
        current.totalPrice += listing.price;
        monthCounts.set(month, current);
      });

      console.log('\nMonthly distribution:');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach((month, idx) => {
        const data = monthCounts.get(idx);
        if (data) {
          console.log(`${month}: ${data.count} sales, avg price: $${Math.round(data.totalPrice / data.count).toLocaleString()}`);
        }
      });
    }
  }

  // Also check overall 911 data
  const { count: total911 } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .ilike('model', '%911%')
    .not('sold_date', 'is', null);

  console.log('\nTotal 911 listings with sold_date:', total911);

  // Check any listings at all
  const { count: totalAll } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .not('sold_date', 'is', null);

  console.log('Total listings with sold_date (all models):', totalAll);
}

checkData().catch(console.error);