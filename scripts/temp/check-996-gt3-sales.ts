import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSales() {
  console.log('=== 996 GT3 Sales Timeline ===\n');

  // Get all 996 GT3 sales
  const { data: sales } = await supabase
    .from('listings')
    .select('price, sold_date, year, mileage')
    .eq('model', '911')
    .eq('trim', 'GT3')
    .eq('generation', '996')
    .not('sold_date', 'is', null)
    .order('sold_date', { ascending: false });

  console.log(`Total 996 GT3 sales: ${sales?.length || 0}\n`);

  if (sales && sales.length > 0) {
    console.log('Recent sales:');
    sales.slice(0, 10).forEach(sale => {
      console.log(`  ${sale.sold_date}: ${sale.year} - $${sale.price?.toLocaleString()} (${sale.mileage?.toLocaleString()} miles)`);
    });

    // Check distribution over time
    const now = new Date();
    const threeMonths = sales.filter(s => new Date(s.sold_date) >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000));
    const sixMonths = sales.filter(s => new Date(s.sold_date) >= new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000));
    const oneYear = sales.filter(s => new Date(s.sold_date) >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000));

    console.log('\nSales distribution:');
    console.log(`  Last 3 months: ${threeMonths.length}`);
    console.log(`  Last 6 months: ${sixMonths.length}`);
    console.log(`  Last 12 months: ${oneYear.length}`);
    console.log(`  Total: ${sales.length}`);

    // Calculate actual trends
    if (oneYear.length > 0) {
      const currentAvg = threeMonths.length > 0
        ? threeMonths.reduce((sum, s) => sum + s.price, 0) / threeMonths.length
        : (sixMonths.length > 0
          ? sixMonths.reduce((sum, s) => sum + s.price, 0) / sixMonths.length
          : 0);

      const yearOldSales = sales.filter(s => {
        const saleDate = new Date(s.sold_date);
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        const yearAgoPlus30 = new Date(yearAgo.getTime() + 30 * 24 * 60 * 60 * 1000);
        const yearAgoMinus30 = new Date(yearAgo.getTime() - 30 * 24 * 60 * 60 * 1000);
        return saleDate >= yearAgoMinus30 && saleDate <= yearAgoPlus30;
      });

      if (yearOldSales.length > 0) {
        const yearAgoAvg = yearOldSales.reduce((sum, s) => sum + s.price, 0) / yearOldSales.length;
        const yearTrend = currentAvg > 0 ? ((currentAvg - yearAgoAvg) / yearAgoAvg) * 100 : 0;

        console.log('\nPrice analysis:');
        console.log(`  Current average (recent): $${currentAvg.toLocaleString()}`);
        console.log(`  1 year ago average: $${yearAgoAvg.toLocaleString()}`);
        console.log(`  Actual 1-year trend: ${yearTrend > 0 ? '+' : ''}${yearTrend.toFixed(2)}%`);
      }
    }
  }

  // Check what the stored narrative thinks
  const { data: narrative } = await supabase
    .from('market_narratives')
    .select('trends_data, updated_at')
    .eq('model', '911')
    .eq('trim', 'GT3')
    .eq('generation', '996')
    .single();

  if (narrative) {
    console.log('\nStored narrative claims:');
    console.log(`  1-year trend: ${narrative.trends_data.oneYear > 0 ? '+' : ''}${narrative.trends_data.oneYear?.toFixed(2)}%`);
    console.log(`  Last updated: ${narrative.updated_at}`);
  }
}

checkSales().catch(console.error);