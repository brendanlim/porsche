import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkCaymanGT4() {
  console.log('Checking for Cayman GT4 data...\n');

  // Check for any 718 Cayman GT4 listings
  const { data: caymanData, error: caymanError } = await supabase
    .from('listings')
    .select('model, trim, generation, year, price, sold_date')
    .or('model.eq.718-cayman,model.eq.718,model.eq.cayman')
    .ilike('trim', '%gt4%')
    .limit(20);

  console.log('Cayman GT4 listings found:', caymanData?.length || 0);

  if (caymanData && caymanData.length > 0) {
    // Group by generation
    const byGeneration = caymanData.reduce((acc: any, item) => {
      const gen = item.generation || 'unknown';
      acc[gen] = (acc[gen] || 0) + 1;
      return acc;
    }, {});

    console.log('By generation:', byGeneration);
    console.log('\nSample listings:');
    caymanData.slice(0, 5).forEach(item => {
      console.log(`  - ${item.year} ${item.model} ${item.trim} (Gen: ${item.generation}) - $${item.price} - Sold: ${item.sold_date || 'Not sold'}`);
    });
  }

  // Check specifically for generation 981
  const { data: gen981Data, error: gen981Error } = await supabase
    .from('listings')
    .select('model, trim, generation, year, price, sold_date')
    .or('model.eq.718-cayman,model.eq.718,model.eq.cayman')
    .ilike('trim', '%gt4%')
    .eq('generation', '981')
    .limit(10);

  console.log('\n981 Generation Cayman GT4 listings:', gen981Data?.length || 0);

  if (gen981Data && gen981Data.length > 0) {
    console.log('Sample 981 listings:');
    gen981Data.slice(0, 5).forEach(item => {
      console.log(`  - ${item.year} ${item.model} ${item.trim} - $${item.price} - Sold: ${item.sold_date || 'Not sold'}`);
    });

    // Check how many are sold
    const soldCount = gen981Data.filter(d => d.sold_date).length;
    console.log(`\nSold listings: ${soldCount}/${gen981Data.length}`);
  }

  // Check for different model naming variations
  console.log('\n=== Checking model variations ===');
  const modelVariations = ['718-cayman', '718', 'cayman', '718 cayman', '718-Cayman'];
  for (const model of modelVariations) {
    const { count } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('model', model)
      .ilike('trim', '%gt4%');

    console.log(`Model "${model}" with GT4 trim: ${count || 0} listings`);
  }
}

checkCaymanGT4();