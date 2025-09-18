-- Migration 007: Add missing columns for better data tracking

-- Add options_text column to store raw options before normalization
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS options_text TEXT;

-- Add list_date column to track when the listing was originally posted
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS list_date DATE;

-- Add comment to explain the columns
COMMENT ON COLUMN listings.options_text IS 'Raw options text extracted from the listing, before normalization';
COMMENT ON COLUMN listings.list_date IS 'Date when the listing was originally posted on the platform';