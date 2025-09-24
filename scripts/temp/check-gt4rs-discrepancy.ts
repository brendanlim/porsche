import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkGT4RSDiscrepancy() {
  console.log('Investigating GT4 RS Listing Count Discrepancy');
  console.log('==============================================\n');

  // 1. Models page query - likely counts ALL GT4 RS listings
  console.log('1. MODELS PAGE QUERY (All GT4 RS):');
  const { data: allGT4RS, count: allCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .or('trim.ilike.%gt4%rs%, trim.ilike.%gt4-rs%, trim.ilike.%gt4 rs%');

  console.log(`   Total GT4 RS listings: ${allCount}`);

  // 2. Check how many have sold_date (analytics page filter)
  console.log('\n2. ANALYTICS PAGE QUERY (GT4 RS with sold_date):');
  const { data: withSoldDate, count: soldDateCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .or('trim.ilike.%gt4%rs%, trim.ilike.%gt4-rs%, trim.ilike.%gt4 rs%')
    .not('sold_date', 'is', null);

  console.log(`   GT4 RS with sold_date: ${soldDateCount}`);

  // 3. Check the exact analytics query (model: 718 Cayman, trim: GT4 RS)
  console.log('\n3. EXACT ANALYTICS QUERY (model=718 Cayman, trim=GT4 RS):');
  const { data: analyticsExact, count: analyticsCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .or('model.eq.718 Cayman, model.eq.Cayman')
    .or('trim.ilike.%gt4%rs%, trim.ilike.%gt4-rs%, trim.ilike.%gt4 rs%')
    .not('sold_date', 'is', null);

  console.log(`   Analytics page count: ${analyticsCount}`);

  // 4. Let's see the breakdown by model field
  console.log('\n4. GT4 RS BREAKDOWN BY MODEL FIELD:');
  const { data: byModel } = await supabase
    .from('listings')
    .select('model')
    .or('trim.ilike.%gt4%rs%, trim.ilike.%gt4-rs%, trim.ilike.%gt4 rs%');

  const modelCounts: Record<string, number> = {};
  byModel?.forEach(listing => {
    const model = listing.model || 'NULL';
    modelCounts[model] = (modelCounts[model] || 0) + 1;
  });

  Object.entries(modelCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([model, count]) => {
      console.log(`   ${model}: ${count} listings`);
    });

  // 5. Check without sold_date filter
  console.log('\n5. GT4 RS WITHOUT sold_date FILTER:');
  const { data: withoutSoldDate } = await supabase
    .from('listings')
    .select('sold_date, source, price')
    .or('trim.ilike.%gt4%rs%, trim.ilike.%gt4-rs%, trim.ilike.%gt4 rs%')
    .is('sold_date', null);

  console.log(`   GT4 RS without sold_date: ${withoutSoldDate?.length || 0}`);

  // Sample of those without sold_date
  if (withoutSoldDate && withoutSoldDate.length > 0) {
    console.log('\n   Sample listings without sold_date:');
    withoutSoldDate.slice(0, 5).forEach(listing => {
      console.log(`     - Source: ${listing.source}, Price: $${listing.price?.toLocaleString() || 'N/A'}`);
    });
  }

  // 6. Check the actual analytics page query more precisely
  console.log('\n6. ANALYTICS PAGE EXACT FILTERS:');

  // This is likely what the analytics page uses
  const { data: analyticsActual, count: actualCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('model', '718 Cayman')  // Exact model match
    .ilike('trim', '%GT4%RS%')   // Trim contains GT4 RS
    .not('sold_date', 'is', null);

  console.log(`   Model='718 Cayman' AND trim LIKE '%GT4%RS%' AND sold_date NOT NULL: ${actualCount}`);

  // 7. Check different model variations
  console.log('\n7. MODEL VARIATIONS WITH GT4 RS:');
  const modelVariations = ['718 Cayman', 'Cayman', '718', '982 Cayman'];

  for (const modelName of modelVariations) {
    const { count } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('model', modelName)
      .ilike('trim', '%GT4%RS%')
      .not('sold_date', 'is', null);

    console.log(`   model='${modelName}': ${count} listings with sold_date`);
  }

  // 8. Summary
  console.log('\n📊 SUMMARY:');
  console.log(`   Models page shows: ${allCount} total GT4 RS`);
  console.log(`   Analytics needs sold_date, only: ${soldDateCount} have it`);
  console.log(`   Analytics also filters by model='718 Cayman': ${actualCount || 'N/A'}`);
  console.log(`   Missing sold_date: ${(allCount || 0) - (soldDateCount || 0)} listings`);
}

checkGT4RSDiscrepancy().catch(console.error);