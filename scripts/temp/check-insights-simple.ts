import { createClient } from '@supabase/supabase-js';

// Use environment variables directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Not set');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Set' : 'Not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInsights() {
  console.log('Checking for LLM market analysis in database...\n');

  try {
    // Check market_insights table
    const { data: insights, error: insightsError, count } = await supabase
      .from('market_insights')
      .select('*', { count: 'exact', head: false })
      .order('created_at', { ascending: false })
      .limit(5);

    if (insightsError) {
      console.log('Error checking market_insights table:', insightsError.message);
      console.log('Table might not exist yet.\n');
    } else {
      console.log(`market_insights table: ${count || 0} total records`);
      if (insights && insights.length > 0) {
        console.log('\nRecent insights:');
        insights.forEach(insight => {
          console.log(`- ${insight.insight_type}: ${insight.model || 'General'} ${insight.trim || ''} (${new Date(insight.created_at).toLocaleDateString()})`);
        });
      } else {
        console.log('No insights found - table exists but is empty');
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Check market_predictions table
    const { data: predictions, error: predError, count: predCount } = await supabase
      .from('market_predictions')
      .select('*', { count: 'exact', head: false })
      .order('created_at', { ascending: false })
      .limit(5);

    if (predError) {
      console.log('Error checking market_predictions table:', predError.message);
      console.log('Table might not exist yet.\n');
    } else {
      console.log(`market_predictions table: ${predCount || 0} total records`);
      if (predictions && predictions.length > 0) {
        console.log('\nRecent predictions:');
        predictions.forEach(pred => {
          console.log(`- ${pred.model || 'General'} ${pred.trim || ''}: $${pred.predicted_value} (${pred.confidence_score}% confidence)`);
        });
      } else {
        console.log('No predictions found - table exists but is empty');
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkInsights();