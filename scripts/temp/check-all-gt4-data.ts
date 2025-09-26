import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkAllGT4Data() {
  console.log('Checking ALL GT4 data comprehensively...\n');

  // Check all possible model/trim combinations for GT4
  const queries = [
    { model: '718-cayman', trimLike: '%gt4%' },
    { model: '718', trimLike: '%gt4%' },
    { model: 'cayman', trimLike: '%gt4%' },
    { model: '718-cayman', trimLike: 'gt4' },
    { model: '718', trimLike: 'gt4' },
    { model: 'cayman', trimLike: 'gt4' },
  ];

  for (const query of queries) {
    const { data, count } = await supabase
      .from('listings')
      .select('*', { count: 'exact' })
      .eq('model', query.model)
      .ilike('trim', query.trimLike);

    if (count && count > 0) {
      console.log(`\n=== Found ${count} listings for model="${query.model}" trim~="${query.trimLike}" ===`);

      const soldCount = data?.filter(d => d.sold_date)?.length || 0;
      console.log(`  Sold: ${soldCount}, Active: ${count - soldCount}`);

      if (data && data.length > 0) {
        // Group by generation
        const byGen: Record<string, {total: number, sold: number}> = {};
        data.forEach(item => {
          const gen = item.generation || 'unknown';
          if (!byGen[gen]) byGen[gen] = { total: 0, sold: 0 };
          byGen[gen].total++;
          if (item.sold_date) byGen[gen].sold++;
        });

        console.log('  By generation:');
        Object.entries(byGen).forEach(([gen, counts]) => {
          console.log(`    ${gen}: ${counts.total} total (${counts.sold} sold)`);
        });
      }
    }
  }

  // Now check specifically for 718-cayman with gt4 trim (the exact combination from the URL)
  console.log('\n=== Checking exact "718-cayman" model with "gt4" trim ===');
  const { data: exactData, error } = await supabase
    .from('listings')
    .select('*')
    .eq('model', '718-cayman')
    .eq('trim', 'gt4');

  console.log('Exact match results:', exactData?.length || 0);

  if (exactData && exactData.length > 0) {
    const soldCount = exactData.filter(d => d.sold_date).length;
    console.log(`  Sold: ${soldCount}, Active: ${exactData.length - soldCount}`);

    // Show samples
    console.log('\nSample listings:');
    exactData.slice(0, 5).forEach(item => {
      console.log(`  ${item.year} ${item.model} ${item.trim} (Gen: ${item.generation}) - $${item.price} - ${item.sold_date ? 'SOLD ' + item.sold_date : 'ACTIVE'}`);
    });
  }

  // Check with normalized trim values
  console.log('\n=== Checking all unique trim values that contain "gt4" ===');
  const { data: allListings } = await supabase
    .from('listings')
    .select('model, trim, generation, sold_date')
    .ilike('trim', '%gt4%');

  if (allListings) {
    const uniqueTrims = new Set<string>();
    const trimCombos: Record<string, {total: number, sold: number}> = {};

    allListings.forEach(item => {
      uniqueTrims.add(item.trim || 'null');
      const key = `${item.model}/${item.trim}/${item.generation || 'unknown'}`;
      if (!trimCombos[key]) trimCombos[key] = { total: 0, sold: 0 };
      trimCombos[key].total++;
      if (item.sold_date) trimCombos[key].sold++;
    });

    console.log('Unique trim values found:', Array.from(uniqueTrims));
    console.log('\nModel/Trim/Generation combinations:');
    Object.entries(trimCombos)
      .sort((a, b) => b[1].sold - a[1].sold)
      .forEach(([combo, counts]) => {
        if (counts.sold > 0) {
          console.log(`  ${combo}: ${counts.total} total (${counts.sold} sold)`);
        }
      });
  }
}

checkAllGT4Data();