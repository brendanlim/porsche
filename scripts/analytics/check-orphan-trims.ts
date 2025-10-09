import { supabaseAdmin } from '../../lib/supabase/admin';

async function checkOrphanTrims() {
  const { data: trims } = await supabaseAdmin
    .from('trims')
    .select(`
      id,
      name,
      is_high_performance,
      models!inner(
        id,
        name
      )
    `)
    .eq('models.manufacturers.name', 'Porsche')
    .order('models.name')
    .order('name');

  console.log('All Porsche trims in database:\n');
  console.log('='.repeat(80));

  let currentModel = '';
  trims?.forEach((trim: any) => {
    if (currentModel !== trim.models.name) {
      currentModel = trim.models.name;
      console.log(`\n${currentModel}:`);
    }
    console.log(`  - ${trim.name} (${trim.id})`);
  });

  // Check if we have listings for these orphan-looking trims
  console.log('\n\n' + '='.repeat(80));
  console.log('Checking listings for confusing trim names...\n');

  const confusingTrims = trims?.filter((t: any) =>
    t.name === 'Base' || t.name === 'GTS' || t.name === 'S'
  );

  for (const trim of confusingTrims || []) {
    console.log(`\n${(trim as any).models.name} ${(trim as any).name}:`);

    const { data: listings } = await supabaseAdmin
      .from('listings')
      .select('id, model, trim, source, sold_date')
      .ilike('model', (trim as any).models.name)
      .ilike('trim', `%${(trim as any).name}%`)
      .not('sold_date', 'is', null)
      .limit(5);

    console.log(`  Listings found: ${listings?.length || 0}`);
    if (listings && listings.length > 0) {
      console.log(`  Sample listings:`);
      listings.forEach(l => {
        console.log(`    - ${l.model} ${l.trim} (${l.source})`);
      });
    }
  }
}

checkOrphanTrims();
