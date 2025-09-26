import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function regenerateAllNarratives() {
  console.log('🔄 Regenerating ALL market narratives with 3-year trend data...\n');

  // Get all unique model/trim combinations from analytics
  const { data: analytics, error } = await supabase
    .from('analytics')
    .select('*')
    .order('model', { ascending: true })
    .order('trim', { ascending: true });

  if (error || !analytics) {
    console.error('Failed to fetch analytics:', error);
    return;
  }

  console.log(`Found ${analytics.length} model/trim combinations in analytics\n`);

  // First, clear all existing narratives to force regeneration
  const { error: deleteError } = await supabase
    .from('market_narratives')
    .delete()
    .gte('id', 0); // Delete all

  if (deleteError) {
    console.log('Warning: Could not clear existing narratives:', deleteError.message);
  } else {
    console.log('✅ Cleared all existing market narratives\n');
  }

  // Process each model/trim
  for (const analytic of analytics) {
    const { model, trim } = analytic;

    console.log(`\n📊 Processing ${model} ${trim}:`);
    console.log(`  Current price: $${analytic.current_avg_price?.toLocaleString()}`);
    console.log(`  Trends: 3mo=${analytic.three_month_appreciation?.toFixed(1)}%, 6mo=${analytic.six_month_appreciation?.toFixed(1)}%, 1yr=${analytic.one_year_appreciation?.toFixed(1)}%`);

    // Calculate 3-year trend if we have enough data
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const { data: historicalData } = await supabase
      .from('listings')
      .select('price, sold_date')
      .eq('model', model)
      .eq('trim', trim)
      .not('sold_date', 'is', null)
      .gte('sold_date', threeYearsAgo.toISOString())
      .lte('sold_date', new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000 + 30 * 24 * 60 * 60 * 1000).toISOString()) // 3 years ago +/- 30 days
      .order('sold_date', { ascending: false })
      .limit(20);

    let threeYearTrend = undefined;
    if (historicalData && historicalData.length >= 5) {
      const avgThreeYearPrice = historicalData.reduce((sum, d) => sum + (d.price || 0), 0) / historicalData.length;
      if (avgThreeYearPrice > 0 && analytic.current_avg_price) {
        threeYearTrend = ((analytic.current_avg_price - avgThreeYearPrice) / avgThreeYearPrice) * 100;
        console.log(`  3-year trend: ${threeYearTrend > 0 ? '+' : ''}${threeYearTrend.toFixed(1)}% (based on ${historicalData.length} historical sales)`);
      }
    }

    // Try common generations for this model
    const generations = getGenerationsForModel(model);

    for (const generation of generations) {
      try {
        const response = await fetch('http://localhost:3003/api/analytics/narrative?refresh=true', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            trim: trim || 'base',
            generation,
            trends: {
              threeMonth: analytic.three_month_appreciation || 0,
              sixMonth: analytic.six_month_appreciation || 0,
              oneYear: analytic.one_year_appreciation || 0,
              threeYear: threeYearTrend // Include 3-year data when available
            },
            currentPrice: analytic.current_avg_price || 0
          })
        });

        if (response.ok) {
          const narrative = await response.json();
          console.log(`    ✅ ${generation}: ${narrative.marketPhase.phase} (${(narrative.confidence * 100).toFixed(0)}% confidence)`);
        } else if (response.status === 404) {
          // Expected for models with insufficient data
          console.log(`    ⚠️  ${generation}: Insufficient data`);
        } else {
          console.log(`    ❌ ${generation}: Failed (${response.status})`);
        }
      } catch (error) {
        console.log(`    ❌ ${generation}: Error -`, error);
      }
    }
  }

  console.log('\n\n✨ Narrative regeneration complete!');

  // Show summary
  const { count } = await supabase
    .from('market_narratives')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📈 Summary: ${count || 0} narratives now in database`);
}

function getGenerationsForModel(model: string): string[] {
  const generationMap: Record<string, string[]> = {
    '911': ['991.1', '991.2', '992'],
    '718': ['981', '982'],
    '718-cayman': ['981', '982'],
    'cayman': ['981', '987.1', '987.2'],
    'boxster': ['981', '986', '987.1', '987.2'],
    'macan': ['95B'],
    'cayenne': ['92A', '9PA', 'E3'],
    'taycan': ['Y1A'],
    'panamera': ['970', '971']
  };

  return generationMap[model] || ['unknown'];
}

regenerateAllNarratives();