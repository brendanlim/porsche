import { supabaseAdmin } from '../../lib/supabase/admin';

async function checkMarketInsights() {
  console.log('Checking market insights from LLMs...\n');

  try {
    // Get recent market insights
    const { data: insights, error: insightsError } = await supabaseAdmin
      .from('market_insights')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (insightsError) {
      console.error('Error fetching insights:', insightsError);
      return;
    }

    if (!insights || insights.length === 0) {
      console.log('No market insights found in database');
      return;
    }

    console.log(`Found ${insights.length} recent market insights:\n`);

    // Group by type
    const byType = insights.reduce((acc, insight) => {
      if (!acc[insight.insight_type]) {
        acc[insight.insight_type] = [];
      }
      acc[insight.insight_type].push(insight);
      return acc;
    }, {} as Record<string, typeof insights>);

    for (const [type, items] of Object.entries(byType)) {
      console.log(`\n${type.toUpperCase()} (${items.length} insights):`);
      console.log('='.repeat(50));
      
      for (const item of items.slice(0, 2)) {
        console.log(`\nModel: ${item.model} ${item.trim || ''}`);
        console.log(`Created: ${new Date(item.created_at).toLocaleString()}`);
        
        if (item.content) {
          try {
            const content = typeof item.content === 'string' 
              ? JSON.parse(item.content) 
              : item.content;
            
            console.log('Content Preview:', JSON.stringify(content, null, 2).slice(0, 500));
          } catch (e) {
            console.log('Content:', item.content?.slice(0, 500));
          }
        }
      }
    }

    // Check market predictions
    const { data: predictions, error: predError } = await supabaseAdmin
      .from('market_predictions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (predictions && predictions.length > 0) {
      console.log(`\n\nMARKET PREDICTIONS (${predictions.length}):`);
      console.log('='.repeat(50));
      
      for (const pred of predictions) {
        console.log(`\n${pred.model} ${pred.trim || ''}`);
        console.log(`Prediction Type: ${pred.prediction_type}`);
        console.log(`Confidence: ${pred.confidence_score}%`);
        console.log(`Predicted Value: $${pred.predicted_value}`);
        console.log(`Time Horizon: ${pred.time_horizon}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

checkMarketInsights();