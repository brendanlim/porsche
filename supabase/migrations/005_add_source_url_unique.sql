-- Migration: Add unique constraint on source_url for upserts
-- This allows us to update existing listings when reparsing

-- Add unique constraint on source_url
ALTER TABLE listings 
ADD CONSTRAINT listings_source_url_unique UNIQUE (source_url);