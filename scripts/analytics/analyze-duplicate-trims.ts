import { supabaseAdmin } from '../../lib/supabase/admin';

async function analyzeDuplicates() {
  const duplicates = [
    { model: '911', trim: 'Carrera' },
    { model: '911', trim: 'GT3' },
    { model: '911', trim: 'GT3 RS' },
  ];

  for (const dup of duplicates) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Analyzing: ${dup.model} ${dup.trim}`);
    console.log('='.repeat(60));

    const { data: trimRecords } = await supabaseAdmin
      .from('trims')
      .select(`
        id,
        name,
        is_high_performance,
        created_at,
        updated_at,
        models!inner(name)
      `)
      .eq('models.name', dup.model)
      .eq('name', dup.trim);

    if (!trimRecords) continue;

    for (const trim of trimRecords) {
      console.log(`\nTrim ID: ${trim.id}`);
      console.log(`  Created: ${trim.created_at}`);
      console.log(`  Updated: ${trim.updated_at}`);
      console.log(`  High Performance: ${trim.is_high_performance}`);

      // Check model_years linked to this trim
      const { data: modelYears } = await supabaseAdmin
        .from('model_years')
        .select('id, year')
        .eq('trim_id', trim.id)
        .order('year');

      console.log(`  Model Years: ${modelYears?.length || 0}`);
      if (modelYears && modelYears.length > 0) {
        const years = modelYears.map(my => my.year).join(', ');
        console.log(`    Years: ${years}`);
      }

      // Check if any listings reference this via model_year
      const modelYearIds = modelYears?.map(my => my.id) || [];
      if (modelYearIds.length > 0) {
        const { count } = await supabaseAdmin
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .in('model_year_id', modelYearIds);

        console.log(`  Listings via model_year_id: ${count || 0}`);
      }

      // Check listings by model/trim text match (what the API currently uses)
      const { data: textMatchListings } = await supabaseAdmin
        .from('listings')
        .select('id, vin', { count: 'exact' })
        .ilike('model', dup.model)
        .ilike('trim', `%${dup.trim}%`);

      console.log(`  Listings via text match: ${textMatchListings?.length || 0}`);
    }

    console.log('\nRECOMMENDATION:');
    const oldest = trimRecords.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0];
    console.log(`  Keep: ${oldest.id} (oldest, created ${oldest.created_at})`);
    console.log(`  Delete: ${trimRecords.filter(t => t.id !== oldest.id).map(t => t.id).join(', ')}`);
  }
}

analyzeDuplicates();
