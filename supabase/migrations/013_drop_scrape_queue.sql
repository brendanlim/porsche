-- Drop scrape_queue related tables as they are no longer used
-- The main scraper (scrape-and-save.ts) doesn't use queuing

-- Drop the stats view first
DROP TABLE IF EXISTS scrape_queue_stats CASCADE;

-- Drop the main queue table
DROP TABLE IF EXISTS scrape_queue CASCADE;

-- Also drop any related indexes that might exist
DROP INDEX IF EXISTS idx_scrape_queue_status;
DROP INDEX IF EXISTS idx_scrape_queue_source_model;
DROP INDEX IF EXISTS idx_scrape_queue_created_at;