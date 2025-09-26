import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function regenerateNarrative() {
  console.log('Regenerating market narratives for 718 GT4 variants...\n');

  // Check all generations of 718 GT4
  const generations = ['981', '982'];

  for (const generation of generations) {
    console.log(`\nProcessing generation ${generation}...`);

    // First delete existing narrative to force regeneration
    const { error: deleteError } = await supabase
      .from('market_narratives')
      .delete()
      .eq('model', '718-cayman')
      .eq('trim', 'gt4')
      .eq('generation', generation);

    if (deleteError) {
      console.log(`  Warning: Could not delete existing narrative for ${generation}:`, deleteError.message);
    } else {
      console.log(`  ✓ Cleared existing narrative for ${generation}`);
    }

    // Get analytics data
    const { data: analytics } = await supabase
      .from('analytics')
      .select('*')
      .eq('model', '718-cayman')
      .eq('trim', 'gt4')
      .single();

    if (!analytics) {
      console.log(`  ⚠ No analytics data found for 718-cayman GT4`);
      continue;
    }

    console.log(`  Trends: 3mo: ${analytics.three_month_appreciation?.toFixed(1)}%, 6mo: ${analytics.six_month_appreciation?.toFixed(1)}%, 1yr: ${analytics.one_year_appreciation?.toFixed(1)}%`);
    console.log(`  Current avg price: $${analytics.current_avg_price?.toLocaleString()}`);

    // Call the API to regenerate narrative
    try {
      const response = await fetch('http://localhost:3003/api/analytics/narrative?refresh=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: '718-cayman',
          trim: 'gt4',
          generation: generation,
          trends: {
            threeMonth: analytics.three_month_appreciation || 0,
            sixMonth: analytics.six_month_appreciation || 0,
            oneYear: analytics.one_year_appreciation || 0
          },
          currentPrice: analytics.current_avg_price || 0
        })
      });

      if (!response.ok) {
        console.error(`  ✗ Failed to regenerate narrative for ${generation}:`, response.status);
        continue;
      }

      const narrative = await response.json();
      console.log(`  ✅ Successfully regenerated narrative for ${generation}!`);
      console.log(`     Phase: ${narrative.marketPhase.phase}`);
      console.log(`     Confidence: ${(narrative.confidence * 100).toFixed(0)}%`);
      console.log(`     Summary: ${narrative.summary}`);
    } catch (error) {
      console.error(`  ✗ Error regenerating narrative for ${generation}:`, error);
    }
  }

  console.log('\n✨ Done regenerating 718 GT4 narratives!');
}

regenerateNarrative();