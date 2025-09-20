import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const model = searchParams.get('model');
  const type = searchParams.get('type') || 'all';
  const days = parseInt(searchParams.get('days') || '30');

  try {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    // Build query
    let query = supabaseAdmin
      .from('chart_predictions')
      .select('*')
      .gte('target_date', now.toISOString())
      .lte('target_date', futureDate.toISOString())
      .order('target_date', { ascending: true });

    // Apply filters
    if (model && model !== 'all') {
      query = query.eq('model', model);
    }

    if (type !== 'all') {
      query = query.eq('prediction_type', type);
    }

    // Get recent predictions (last 24 hours to ensure freshness)
    query = query.gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

    const { data: predictions, error } = await query;

    if (error) throw error;

    // Process predictions for chart consumption
    const processedData = {
      pricePredictions: [] as any[],
      volumePredictions: [] as any[],
      marketTrends: [] as any[],
      anomalies: [] as any[],
      confidence: {
        overall: 0,
        byModel: {} as Record<string, number>
      }
    };

    if (predictions && predictions.length > 0) {
      predictions.forEach(pred => {
        const targetDate = new Date(pred.target_date).toISOString().split('T')[0];

        switch (pred.prediction_type) {
          case 'price':
            if (pred.predicted_value && typeof pred.predicted_value === 'object') {
              processedData.pricePredictions.push({
                date: targetDate,
                model: pred.model,
                trim: pred.trim,
                price: (pred.predicted_value as any).price || 0,
                volume: (pred.predicted_value as any).volume || 0,
                trend: (pred.predicted_value as any).trend || 'stable',
                changePercent: (pred.predicted_value as any).changePercent || 0,
                confidence: pred.confidence_score || 0.5
              });
            }
            break;

          case 'volume':
            if (pred.predicted_value && typeof pred.predicted_value === 'object') {
              processedData.volumePredictions.push({
                date: targetDate,
                model: pred.model,
                volume: (pred.predicted_value as any).volume || 0,
                confidence: pred.confidence_score || 0.5
              });
            }
            break;

          case 'market_trend':
            if (pred.predicted_value && typeof pred.predicted_value === 'object') {
              const marketData = pred.predicted_value as any;
              if (marketData.weeklyPredictions) {
                marketData.weeklyPredictions.forEach((week: any) => {
                  processedData.marketTrends.push({
                    weekNumber: week.weekNumber,
                    avgPrice: week.avgPrice,
                    volume: week.totalVolume,
                    sentiment: week.marketSentiment,
                    confidence: week.confidence || pred.confidence_score || 0.5
                  });
                });
              }

              // Add hot/cold models
              if (marketData.hotModels || marketData.coldModels) {
                processedData.marketTrends.push({
                  type: 'model_temperature',
                  hot: marketData.hotModels || [],
                  cold: marketData.coldModels || []
                });
              }
            }
            break;

          case 'anomaly':
            if (pred.predicted_value && typeof pred.predicted_value === 'object') {
              const anomalyData = pred.predicted_value as any;
              if (anomalyData.anomalies) {
                anomalyData.anomalies.forEach((anomaly: any) => {
                  processedData.anomalies.push({
                    type: anomaly.type,
                    severity: anomaly.severity,
                    description: anomaly.description,
                    models: anomaly.affectedModels,
                    action: anomaly.recommendedAction,
                    score: pred.anomaly_score || 0.5
                  });
                });
              }
            }
            break;
        }

        // Calculate confidence scores
        if (pred.confidence_score) {
          const modelKey = pred.model || 'overall';
          if (!processedData.confidence.byModel[modelKey]) {
            processedData.confidence.byModel[modelKey] = pred.confidence_score;
          } else {
            // Average confidence scores
            processedData.confidence.byModel[modelKey] =
              (processedData.confidence.byModel[modelKey] + pred.confidence_score) / 2;
          }
        }
      });

      // Calculate overall confidence
      const confidenceValues = Object.values(processedData.confidence.byModel);
      if (confidenceValues.length > 0) {
        processedData.confidence.overall =
          confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length;
      }
    }

    // Add metadata
    const response = {
      success: true,
      data: processedData,
      metadata: {
        predictionCount: predictions?.length || 0,
        timeRange: {
          from: now.toISOString(),
          to: futureDate.toISOString()
        },
        lastUpdated: predictions?.[0]?.created_at || now.toISOString(),
        models: [...new Set(predictions?.map(p => p.model).filter(Boolean))],
        hasRecentPredictions: predictions && predictions.length > 0
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Predictions API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch predictions',
        data: {
          pricePredictions: [],
          volumePredictions: [],
          marketTrends: [],
          anomalies: [],
          confidence: { overall: 0, byModel: {} }
        }
      },
      { status: 500 }
    );
  }
}