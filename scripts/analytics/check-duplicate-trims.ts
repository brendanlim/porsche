import { supabaseAdmin } from '../../lib/supabase/admin';

async function checkDuplicateTrims() {
  const { data: trims, error } = await supabaseAdmin
    .from('trims')
    .select(`
      id,
      name,
      is_high_performance,
      models!inner(
        name,
        manufacturers!inner(name)
      )
    `)
    .eq('models.manufacturers.name', 'Porsche')
    .order('name');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total trims: ${trims.length}\n`);

  // Group by model + trim name
  const groups = new Map<string, any[]>();
  trims.forEach((trim: any) => {
    const key = `${trim.models.name} ${trim.name}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(trim);
  });

  // Find duplicates
  const duplicates = Array.from(groups.entries()).filter(([_, items]) => items.length > 1);

  if (duplicates.length === 0) {
    console.log('No duplicates found!');
  } else {
    console.log(`Found ${duplicates.length} duplicate trim combinations:\n`);
    duplicates.forEach(([key, items]) => {
      console.log(`${key} (${items.length} entries):`);
      items.forEach(item => {
        console.log(`  - ID: ${item.id}, High Performance: ${item.is_high_performance}`);
      });
      console.log('');
    });
  }

  // Show all unique combinations
  console.log('\nAll trim combinations:');
  Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([key, items]) => {
      console.log(`  ${key} (${items.length}x)`);
    });
}

checkDuplicateTrims();
