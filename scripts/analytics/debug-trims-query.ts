import { supabaseAdmin } from '../../lib/supabase/admin';

async function debugTrims() {
  // First, get all trims without manufacturer filter
  const { data: allTrims, error } = await supabaseAdmin
    .from('trims')
    .select(`
      id,
      name,
      model_id,
      is_high_performance
    `)
    .order('name');

  console.log(`Total trims: ${allTrims?.length || 0}`);
  if (error) {
    console.error('Error:', error);
    return;
  }

  // Get all models
  const { data: models } = await supabaseAdmin
    .from('models')
    .select('id, name, manufacturer_id');

  console.log(`Total models: ${models?.length || 0}\n`);

  // Get manufacturers
  const { data: manufacturers } = await supabaseAdmin
    .from('manufacturers')
    .select('id, name');

  console.log('Manufacturers:');
  manufacturers?.forEach(m => console.log(`  ${m.name} (${m.id})`));

  // Match them up
  console.log('\n\nAll trims with their models:\n');
  console.log('='.repeat(80));

  const modelMap = new Map(models?.map(m => [m.id, m]) || []);
  const mfgMap = new Map(manufacturers?.map(m => [m.id, m]) || []);

  allTrims?.forEach(trim => {
    const model = modelMap.get(trim.model_id);
    const mfg = model ? mfgMap.get(model.manufacturer_id) : null;
    console.log(`${mfg?.name || 'Unknown'} ${model?.name || 'Unknown'} ${trim.name}`);
  });

  // Find the ones with 0 listings
  console.log('\n\n' + '='.repeat(80));
  console.log('Trims with confusing names (Base, GTS, S):\n');

  const confusing = allTrims?.filter(t =>
    t.name === 'Base' || t.name === 'GTS' || t.name === 'S'
  );

  for (const trim of confusing || []) {
    const model = modelMap.get(trim.model_id);
    console.log(`\n${model?.name} ${trim.name} (ID: ${trim.id}):`);

    // Try to find listings
    const { count } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .ilike('model', model?.name || '')
      .ilike('trim', `%${trim.name}%`);

    console.log(`  Listings with sold_date: ${count || 0}`);

    // Check without sold_date filter
    const { count: allCount } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .ilike('model', model?.name || '')
      .ilike('trim', `%${trim.name}%`)
      .not('sold_date', 'is', null);

    console.log(`  Total listings: ${allCount || 0}`);
  }
}

debugTrims();
