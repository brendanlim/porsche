import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkNarratives() {
  console.log('Checking for market narratives...');

  // Check for any narratives at all
  const { data: allNarratives, error: allError } = await supabase
    .from('market_narratives')
    .select('model, trim, generation, created_at')
    .limit(5);

  console.log('\nAll narratives (sample):', allNarratives?.length || 0);
  if (allNarratives && allNarratives.length > 0) {
    console.log('Samples:', allNarratives);
  }

  // Check specifically for Cayman GT4
  const { data, error } = await supabase
    .from('market_narratives')
    .select('*')
    .eq('model', '718-cayman')
    .eq('trim', 'gt4');

  console.log('\nCayman GT4 narratives found:', data?.length || 0);
  if (data && data.length > 0) {
    console.log('Generations found:', [...new Set(data.map(d => d.generation))]);

    // Check for 981 specifically
    const gen981 = data.filter(d => d.generation === '981');
    console.log('981 generation narratives:', gen981.length);

    if (gen981.length > 0) {
      console.log('Sample 981 narrative:', {
        id: gen981[0].id,
        model: gen981[0].model,
        trim: gen981[0].trim,
        generation: gen981[0].generation,
        created_at: gen981[0].created_at,
        narrative_length: gen981[0].narrative?.length || 0
      });
    }
  }
}

checkNarratives();