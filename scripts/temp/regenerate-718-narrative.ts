import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function regenerate718GT4() {
  console.log('Checking and regenerating 718 GT4 market narratives...\n');

  // First check if we have analytics for 718 GT4
  const { data: analytics, error: analyticsError } = await supabase
    .from('analytics')
    .select('*')
    .eq('model', '718-cayman')
    .eq('trim', 'gt4')
    .single();

  if (analyticsError || !analytics) {
    console.log('No analytics found for 718-cayman gt4, checking variations...');

    // Try different variations
    const { data: allAnalytics } = await supabase
      .from('analytics')
      .select('model, trim, three_month_appreciation, six_month_appreciation, one_year_appreciation, current_avg_price')
      .ilike('model', '%718%')
      .ilike('trim', '%gt4%');

    if (allAnalytics && allAnalytics.length > 0) {
      console.log('Found analytics with 718/GT4 variations:');
      allAnalytics.forEach(a => {
        console.log(`  ${a.model} ${a.trim}: 3mo=${a.three_month_appreciation?.toFixed(1)}%, price=$${a.current_avg_price?.toLocaleString()}`);
      });
    }
    return;
  }

  console.log('Found analytics for 718-cayman GT4:');
  console.log(`  3-month: ${analytics.three_month_appreciation?.toFixed(1)}%`);
  console.log(`  6-month: ${analytics.six_month_appreciation?.toFixed(1)}%`);
  console.log(`  1-year: ${analytics.one_year_appreciation?.toFixed(1)}%`);
  console.log(`  Current price: $${analytics.current_avg_price?.toLocaleString()}\n`);

  // Delete existing narratives for 718-cayman GT4
  const { error: deleteError } = await supabase
    .from('market_narratives')
    .delete()
    .eq('model', '718-cayman')
    .eq('trim', 'gt4');

  if (deleteError) {
    console.log('Could not delete existing narratives:', deleteError.message);
  } else {
    console.log('Cleared existing narratives for 718-cayman GT4');
  }

  // Now regenerate for each generation
  const generations = ['981', '982'];

  for (const generation of generations) {
    console.log(`\nRegenerating narrative for generation ${generation}...`);

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

      if (response.ok) {
        const narrative = await response.json();
        console.log(`✅ Generated narrative for ${generation}:`);
        console.log(`   Phase: ${narrative.marketPhase.phase}`);
        console.log(`   Summary: ${narrative.summary}`);
        console.log(`   Confidence: ${(narrative.confidence * 100).toFixed(0)}%`);
      } else {
        const errorText = await response.text();
        console.log(`❌ Failed for ${generation}: ${response.status} - ${errorText.substring(0, 100)}`);
      }
    } catch (error) {
      console.log(`❌ Error for ${generation}:`, error);
    }
  }

  console.log('\n✨ Done!');
}

regenerate718GT4();