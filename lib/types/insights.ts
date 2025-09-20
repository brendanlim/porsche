export interface MarketInsight {
  id: string;
  insight_type: 'daily' | 'weekly' | 'model-specific';
  model?: string;
  trim?: string;
  time_range?: '7d' | '30d' | '90d' | '1y';
  summary?: string;
  key_findings?: KeyFinding[];
  anomalies?: Anomaly[];
  predictions?: Prediction[];
  recommendations?: Recommendation[];
  trending_models?: TrendingModel[];
  undervalued_listings?: UndervaluedListing[];
  data_points?: number;
  confidence_score?: number;
  generated_at: string;
  expires_at?: string;
  views: number;
  was_accurate?: boolean;
  accuracy_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MarketPrediction {
  id: string;
  insight_id: string;
  prediction_type: 'price' | 'volume' | 'trend';
  target_date: string;
  predicted_value: any;
  actual_value?: any;
  accuracy_score?: number;
  validated_at?: string;
  created_at: string;
}

export interface KeyFinding {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: 'price' | 'volume' | 'trend' | 'model' | 'market';
  value?: number;
  change?: number;
  unit?: string;
}

export interface Anomaly {
  type: 'price' | 'volume' | 'geographic' | 'seasonal';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  confidence: number;
  location?: string;
  model?: string;
  trim?: string;
  details?: {
    expected?: number;
    actual?: number;
    deviation?: number;
  };
}

export interface Prediction {
  model?: string;
  trim?: string;
  timeframe: '30d' | '90d' | '6m' | '1y';
  prediction_type: 'price_increase' | 'price_decrease' | 'volume_increase' | 'volume_decrease';
  confidence: number;
  expected_change: number;
  reasoning: string;
  supporting_factors: string[];
}

export interface Recommendation {
  action: 'buy' | 'sell' | 'hold' | 'watch';
  model?: string;
  trim?: string;
  priority: 'high' | 'medium' | 'low';
  timeframe: 'immediate' | 'short_term' | 'long_term';
  reasoning: string;
  confidence: number;
  expected_return?: number;
  risk_level: 'low' | 'medium' | 'high';
  supporting_data: string[];
}

export interface TrendingModel {
  model: string;
  trim?: string;
  trend_direction: 'up' | 'down' | 'stable';
  volume_change: number;
  price_change: number;
  interest_score: number;
  time_on_market_change: number;
  reasoning: string;
}

export interface UndervaluedListing {
  listing_id?: string;
  model: string;
  trim: string;
  year: number;
  mileage: number;
  current_price: number;
  estimated_value: number;
  savings_potential: number;
  confidence: number;
  reasoning: string;
  location?: string;
}

export interface InsightsResponse {
  success: boolean;
  data: {
    insights: MarketInsight[];
    predictions: MarketPrediction[];
    stats: {
      totalInsights: number;
      totalPredictions: number;
      hasData: boolean;
    };
  };
  error?: string;
}

export interface InsightFilters {
  type?: 'all' | 'daily' | 'weekly' | 'model-specific';
  model?: string;
  trim?: string;
  timeRange?: '7d' | '30d' | '90d' | '1y';
  limit?: number;
}