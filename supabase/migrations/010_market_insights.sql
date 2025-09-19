-- Create market_insights table for storing AI-generated insights
CREATE TABLE IF NOT EXISTS public.market_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  insight_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'model-specific'
  model VARCHAR(50), -- e.g., '911', '718', null for general insights
  trim VARCHAR(100), -- e.g., 'GT3', 'GT4 RS', null for model-level or general
  time_range VARCHAR(20), -- e.g., '7d', '30d', '90d', '1y'
  
  -- Insight content
  summary TEXT,
  key_findings JSONB, -- Array of key findings
  anomalies JSONB, -- Detected anomalies
  predictions JSONB, -- Price predictions
  recommendations JSONB, -- Buy/sell recommendations
  trending_models JSONB, -- Trending models analysis
  undervalued_listings JSONB, -- Potentially undervalued cars
  
  -- Metadata
  data_points INTEGER, -- Number of listings analyzed
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ, -- When this insight becomes stale
  
  -- Tracking
  views INTEGER DEFAULT 0,
  was_accurate BOOLEAN, -- For tracking prediction accuracy
  accuracy_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX idx_market_insights_type ON public.market_insights(insight_type);
CREATE INDEX idx_market_insights_model_trim ON public.market_insights(model, trim);
CREATE INDEX idx_market_insights_generated_at ON public.market_insights(generated_at DESC);
CREATE INDEX idx_market_insights_expires_at ON public.market_insights(expires_at);

-- Create market_predictions table for tracking prediction accuracy
CREATE TABLE IF NOT EXISTS public.market_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  insight_id UUID REFERENCES public.market_insights(id) ON DELETE CASCADE,
  prediction_type VARCHAR(50) NOT NULL, -- 'price', 'volume', 'trend'
  target_date DATE NOT NULL,
  predicted_value JSONB NOT NULL,
  actual_value JSONB,
  accuracy_score DECIMAL(3,2),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_market_predictions_insight ON public.market_predictions(insight_id);
CREATE INDEX idx_market_predictions_target_date ON public.market_predictions(target_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_market_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_market_insights_updated_at
  BEFORE UPDATE ON public.market_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_market_insights_updated_at();

-- Add RLS policies
ALTER TABLE public.market_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_predictions ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Allow public read access to market insights"
  ON public.market_insights
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to market predictions"
  ON public.market_predictions
  FOR SELECT
  USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Service role can manage market insights"
  ON public.market_insights
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage market predictions"
  ON public.market_predictions
  FOR ALL
  USING (auth.role() = 'service_role');