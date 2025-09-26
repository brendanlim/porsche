-- Add generation column to market_narratives table
ALTER TABLE market_narratives
ADD COLUMN generation TEXT;

-- Update the unique constraint to include generation
-- First drop the old constraint
ALTER TABLE market_narratives
DROP CONSTRAINT IF EXISTS market_narratives_model_trim_key;

-- Add new constraint including generation
ALTER TABLE market_narratives
ADD CONSTRAINT market_narratives_model_trim_generation_key
UNIQUE (model, trim, generation);

-- Add index for faster queries
CREATE INDEX idx_market_narratives_generation ON market_narratives(generation);
CREATE INDEX idx_market_narratives_lookup ON market_narratives(model, trim, generation);

-- Update existing records to have a default generation if needed
-- (This is optional - remove if you want to regenerate all narratives)
UPDATE market_narratives
SET generation = 'unknown'
WHERE generation IS NULL;