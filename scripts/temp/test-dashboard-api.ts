#!/usr/bin/env tsx

import { supabaseAdmin } from '../../lib/supabase/admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testDashboardData() {
  console.log('Testing dashboard data availability...\n');

  // Test what the dashboard API would fetch
  const now = new Date();
  const startDate = new Date();
  startDate.setDate(now.getDate() - 30);

  // Check listings with sold_date
  const { data: listings, error, count } = await supabaseAdmin
    .from('listings')
    .select('*', { count: 'exact' })
    .gte('sold_date', startDate.toISOString())
    .lte('sold_date', now.toISOString())
    .limit(10);

  console.log('Dashboard API query results:');
  console.log('- Date range:', startDate.toLocaleDateString(), 'to', now.toLocaleDateString());
  console.log('- Total listings in range:', count || 0);

  if (error) {
    console.log('- Error:', error.message);
    return;
  }

  if (!listings || listings.length === 0) {
    console.log('\n❌ NO DATA FOUND - This is why charts are empty!');
    console.log('The dashboard is filtering by sold_date in the last 30 days.');

    // Check if we have ANY data with sold_date
    const { count: totalWithSoldDate } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .not('sold_date', 'is', null);

    console.log('\nTotal listings with sold_date in database:', totalWithSoldDate);

    // Get the most recent sold_date
    const { data: recent } = await supabaseAdmin
      .from('listings')
      .select('sold_date')
      .not('sold_date', 'is', null)
      .order('sold_date', { ascending: false })
      .limit(1);

    if (recent && recent[0]) {
      console.log('Most recent sold_date:', new Date(recent[0].sold_date).toLocaleDateString());
      const daysSince = Math.floor((now.getTime() - new Date(recent[0].sold_date).getTime()) / (1000 * 60 * 60 * 24));
      console.log('Days since last sale:', daysSince);

      if (daysSince > 30) {
        console.log('\n⚠️  Problem: All sales are older than 30 days!');
        console.log('Solution: Change the time range selector to "90 days", "1 year", or "All Time"');
      }
    }
  } else {
    console.log('\n✅ Found data for charts:');
    console.log('- Sample listing:', {
      model: listings[0].model,
      price: listings[0].price,
      sold_date: listings[0].sold_date
    });
  }

  // Check model distribution
  const modelCounts = new Map<string, number>();
  listings?.forEach(l => {
    if (l.model) {
      modelCounts.set(l.model, (modelCounts.get(l.model) || 0) + 1);
    }
  });

  if (modelCounts.size > 0) {
    console.log('\nModel distribution:');
    Array.from(modelCounts.entries()).forEach(([model, count]) => {
      console.log(`  - ${model}: ${count}`);
    });
  }
}

testDashboardData().catch(console.error);