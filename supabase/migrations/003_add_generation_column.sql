-- Migration: Add denormalized model, trim, and generation columns to listings table
-- This allows easier querying and reduces joins while maintaining FK relationships

-- Add denormalized columns for easier access
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS trim TEXT,
ADD COLUMN IF NOT EXISTS generation TEXT,
ADD COLUMN IF NOT EXISTS year INTEGER;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_listings_model 
ON listings(model);

CREATE INDEX IF NOT EXISTS idx_listings_trim 
ON listings(trim);

CREATE INDEX IF NOT EXISTS idx_listings_generation 
ON listings(generation);

CREATE INDEX IF NOT EXISTS idx_listings_year 
ON listings(year);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_listings_model_trim_generation 
ON listings(model, trim, generation);

-- Add check constraint to ensure sports cars only
-- (This is a reminder that we should never have SUVs/sedans)
-- First drop if exists, then add
ALTER TABLE listings 
DROP CONSTRAINT IF EXISTS check_sports_cars_only;

ALTER TABLE listings 
ADD CONSTRAINT check_sports_cars_only 
CHECK (
  model IS NULL OR model NOT IN ('Cayenne', 'Macan', 'Panamera', 'Taycan')
);

-- Add comments to document the columns
COMMENT ON COLUMN listings.model IS 'Denormalized model name (e.g., 911, 718 Cayman)';
COMMENT ON COLUMN listings.trim IS 'Denormalized trim name (e.g., GT3, GT4, Turbo)';
COMMENT ON COLUMN listings.generation IS 'Vehicle generation code (e.g., 992.1, 992.2, 981, 718)';
COMMENT ON COLUMN listings.year IS 'Model year of the vehicle';