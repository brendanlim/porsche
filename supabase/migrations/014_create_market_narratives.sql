-- Create market_narratives table for caching generated narratives
CREATE TABLE IF NOT EXISTS market_narratives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model TEXT NOT NULL,
  trim TEXT NOT NULL,
  summary TEXT NOT NULL,
  detailed_story TEXT NOT NULL,
  market_phase JSONB NOT NULL,
  key_insights TEXT[] NOT NULL,
  recommendation TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  trends_data JSONB,
  current_price DECIMAL(12,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint on model+trim combination
  UNIQUE(model, trim)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_market_narratives_model_trim ON market_narratives(model, trim);
CREATE INDEX IF NOT EXISTS idx_market_narratives_updated_at ON market_narratives(updated_at);

-- Add RLS policies
ALTER TABLE market_narratives ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for the API to serve cached narratives)
CREATE POLICY "Allow public read access to market narratives"
ON market_narratives FOR SELECT
TO public
USING (true);

-- Allow service role full access (for caching new narratives)
CREATE POLICY "Allow service role full access to market narratives"
ON market_narratives FOR ALL
TO service_role
USING (true)
WITH CHECK (true);