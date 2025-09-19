-- Create table for storing VIN-only records (vehicles without listings)
-- This allows us to track VINs that users search for even before they appear in listings

CREATE TABLE IF NOT EXISTS vin_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vin VARCHAR(17) NOT NULL UNIQUE,
  model_year INTEGER,
  model VARCHAR(50),
  trim VARCHAR(100),
  generation VARCHAR(50),
  body_style VARCHAR(100),
  engine_type VARCHAR(100),
  manufacturer VARCHAR(100),
  plant_code VARCHAR(100),
  decoded_data JSONB,
  decoded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_listing_id UUID REFERENCES listings(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_vin_records_vin ON vin_records(vin);
CREATE INDEX idx_vin_records_model ON vin_records(model);
CREATE INDEX idx_vin_records_model_year ON vin_records(model_year);
CREATE INDEX idx_vin_records_created_at ON vin_records(created_at DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vin_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vin_records_updated_at
BEFORE UPDATE ON vin_records
FOR EACH ROW
EXECUTE FUNCTION update_vin_records_updated_at();

-- Add comment explaining the table's purpose
COMMENT ON TABLE vin_records IS 'Stores decoded VIN information for vehicles that may not have listings yet. This allows tracking of user interest and provides decoded data even without market listings.';