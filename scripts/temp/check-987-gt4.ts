import { supabaseAdmin } from '@/lib/supabase/admin';

async function check987GT4() {
  try {
    // First check what models exist
    const { data: models, error: modelError } = await supabaseAdmin
      .from('models')
      .select('*');
    
    console.log('Models:', models?.map(m => m.name));

    // Check for any 987 generation entries
    const { data: generations, error: genError } = await supabaseAdmin
      .from('generations')
      .select('*')
      .ilike('name', '%987%');

    if (genError) {
      console.error('Error checking generations:', genError);
    } else {
      console.log('Found 987 generations:', generations);
    }

    // Check for any Boxster models with invalid trims (GT4 didn't exist for 987)
    const { data: boxsterModelYears, error: boxsterError } = await supabaseAdmin
      .from('model_years')
      .select(`
        *,
        models!inner(name),
        trims!inner(name),
        generations(name)
      `)
      .eq('models.name', 'Boxster')
      .in('trims.name', ['GT4', 'GT4 RS']);

    if (boxsterError) {
      console.error('Error checking Boxster GT4:', boxsterError);
    } else {
      console.log('Found Boxster GT4/GT4 RS entries (THESE SHOULD NOT EXIST):');
      boxsterModelYears?.forEach(my => {
        console.log(`- ${my.year} Boxster ${my.trims.name} (ID: ${my.id})`);
      });
      
      if (boxsterModelYears && boxsterModelYears.length > 0) {
        const modelYearIds = boxsterModelYears.map(my => my.id);
        const { data: listings, error: listingsError } = await supabaseAdmin
          .from('listings')
          .select('id, source_url')
          .in('model_year_id', modelYearIds);

        console.log(`Found ${listings?.length || 0} listings with invalid Boxster GT4/GT4 RS`);
        if (listings && listings.length > 0) {
          console.log('Sample listings:', listings.slice(0, 3));
        }
      }
    }

    // Also check for any pre-2016 Cayman GT4 (GT4 was introduced in 2015)
    const { data: earlyGT4, error: earlyError } = await supabaseAdmin
      .from('model_years')
      .select(`
        *,
        models!inner(name),
        trims!inner(name),
        generations(name)
      `)
      .eq('models.name', 'Cayman')
      .in('trims.name', ['GT4', 'GT4 RS'])
      .lt('year', 2015);

    if (earlyError) {
      console.error('Error checking early GT4:', earlyError);
    } else if (earlyGT4 && earlyGT4.length > 0) {
      console.log('Found pre-2015 Cayman GT4 entries (THESE SHOULD NOT EXIST):');
      earlyGT4?.forEach(my => {
        console.log(`- ${my.year} Cayman ${my.trims.name} (ID: ${my.id})`);
      });
    }

  } catch (error) {
    console.error('Script error:', error);
  }
}

check987GT4();