import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Get market insights
    let query = supabaseAdmin
      .from('market_insights')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (type !== 'all') {
      query = query.eq('insight_type', type);
    }
    
    const { data: insights, error: insightsError } = await query;
    
    if (insightsError) {
      console.error('Error fetching insights:', insightsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch market insights',
        details: insightsError.message
      }, { status: 500 });
    }
    
    // Get market predictions
    const { data: predictions, error: predictionsError } = await supabaseAdmin
      .from('market_predictions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Get count of total insights
    const { count: totalInsights } = await supabaseAdmin
      .from('market_insights')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalPredictions } = await supabaseAdmin
      .from('market_predictions')
      .select('*', { count: 'exact', head: true });
    
    return NextResponse.json({
      success: true,
      data: {
        insights: insights || [],
        predictions: predictions || [],
        stats: {
          totalInsights: totalInsights || 0,
          totalPredictions: totalPredictions || 0,
          hasData: (totalInsights || 0) > 0 || (totalPredictions || 0) > 0
        }
      }
    });
  } catch (error) {
    console.error('Market insights error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market insights', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}