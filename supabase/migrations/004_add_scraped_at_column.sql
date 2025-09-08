-- Migration: Add scraped_at column to listings table
-- This tracks when each listing was scraped/processed

-- Add scraped_at column
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ DEFAULT NOW();

-- Add index for querying recent scrapes
CREATE INDEX IF NOT EXISTS idx_listings_scraped_at 
ON listings(scraped_at DESC);

-- Add comment to document the column
COMMENT ON COLUMN listings.scraped_at IS 'Timestamp when this listing was scraped or reprocessed';