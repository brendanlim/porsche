-- Create table for storing AI-generated chart predictions
CREATE TABLE IF NOT EXISTS chart_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model VARCHAR(50),
  trim VARCHAR(100),
  prediction_type VARCHAR(50) NOT NULL, -- 'price', 'volume', 'market_trend', 'anomaly'
  prediction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  target_date TIMESTAMPTZ NOT NULL,
  predicted_value JSONB NOT NULL, -- Flexible structure for different prediction types
  actual_value JSONB, -- For validation after the fact
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  anomaly_score DECIMAL(3,2) CHECK (anomaly_score >= 0 AND anomaly_score <= 1),
  factors TEXT[], -- Factors considered in the prediction
  accuracy_score DECIMAL(3,2), -- Calculated after validation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_chart_predictions_model ON chart_predictions(model);
CREATE INDEX idx_chart_predictions_type ON chart_predictions(prediction_type);
CREATE INDEX idx_chart_predictions_target_date ON chart_predictions(target_date);
CREATE INDEX idx_chart_predictions_created_at ON chart_predictions(created_at DESC);

-- Create a view for recent predictions (last 7 days)
CREATE OR REPLACE VIEW recent_chart_predictions AS
SELECT * FROM chart_predictions
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Create a view for upcoming predictions (next 30 days)
CREATE OR REPLACE VIEW upcoming_predictions AS
SELECT * FROM chart_predictions
WHERE target_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
  AND actual_value IS NULL
ORDER BY target_date ASC;

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_chart_predictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chart_predictions_timestamp
  BEFORE UPDATE ON chart_predictions
  FOR EACH ROW
  EXECUTE FUNCTION update_chart_predictions_updated_at();

-- Grant necessary permissions
GRANT SELECT ON chart_predictions TO anon, authenticated;
GRANT INSERT, UPDATE ON chart_predictions TO authenticated;
GRANT SELECT ON recent_chart_predictions TO anon, authenticated;
GRANT SELECT ON upcoming_predictions TO anon, authenticated;