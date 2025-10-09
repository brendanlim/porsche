import { supabaseAdmin } from '../../lib/supabase/admin';

async function removeDuplicates() {
  const toDelete = [
    // 911 Carrera duplicates
    'c0ddd806-9942-4a3e-b5fb-61b0eea3ba97',

    // 911 GT3 duplicates
    '11d0d536-40ba-43e8-b209-b1f4c5a3536b',
    '8337ce33-50cc-47fa-ae8b-ecf620998f96',

    // 911 GT3 RS duplicates
    'ba99232f-bdbd-4587-9162-c5b91e38d5dd',
  ];

  console.log('Removing duplicate trims...\n');

  for (const trimId of toDelete) {
    console.log(`Deleting trim ID: ${trimId}`);

    // First delete associated model_years (foreign key constraint)
    const { data: modelYears } = await supabaseAdmin
      .from('model_years')
      .delete()
      .eq('trim_id', trimId)
      .select();

    console.log(`  Deleted ${modelYears?.length || 0} model_years`);

    // Then delete the trim
    const { error } = await supabaseAdmin
      .from('trims')
      .delete()
      .eq('id', trimId);

    if (error) {
      console.error(`  Error deleting trim: ${error.message}`);
    } else {
      console.log(`  ✅ Trim deleted\n`);
    }
  }

  console.log('Verifying no duplicates remain...');
  const { data: trims } = await supabaseAdmin
    .from('trims')
    .select(`
      id,
      name,
      models!inner(name)
    `)
    .eq('models.manufacturers.name', 'Porsche')
    .order('name');

  const groups = new Map<string, any[]>();
  trims?.forEach((trim: any) => {
    const key = `${trim.models.name} ${trim.name}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(trim);
  });

  const remaining = Array.from(groups.entries()).filter(([_, items]) => items.length > 1);
  if (remaining.length === 0) {
    console.log('✅ No duplicates found!');
  } else {
    console.log(`⚠️  Still have ${remaining.length} duplicates:`);
    remaining.forEach(([key, items]) => {
      console.log(`  ${key}: ${items.length} entries`);
    });
  }
}

removeDuplicates();
