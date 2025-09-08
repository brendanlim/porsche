-- Add raw HTML storage columns to listings table
ALTER TABLE listings
ADD COLUMN raw_html_path TEXT,
ADD COLUMN raw_html_stored_at TIMESTAMPTZ,
ADD COLUMN raw_html_size INTEGER;

-- Add raw HTML storage to ingestion_runs for tracking
ALTER TABLE ingestion_runs
ADD COLUMN total_html_stored INTEGER DEFAULT 0,
ADD COLUMN total_storage_bytes BIGINT DEFAULT 0;

-- Create index for finding listings without stored HTML
CREATE INDEX idx_listings_missing_html ON listings(id) 
WHERE raw_html_path IS NULL;

-- Create a raw_html_cache table for managing cached HTML
CREATE TABLE raw_html_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    content_hash VARCHAR(64), -- SHA256 hash of content
    scraped_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
    metadata JSONB,
    
    UNIQUE(listing_id)
);

-- Create indexes separately
CREATE INDEX idx_html_cache_source ON raw_html_cache(source);
CREATE INDEX idx_html_cache_expires ON raw_html_cache(expires_at);
CREATE INDEX idx_html_cache_url_hash ON raw_html_cache(content_hash);
CREATE INDEX idx_html_cache_scraped ON raw_html_cache(scraped_at DESC);

-- Function to clean up expired HTML cache
CREATE OR REPLACE FUNCTION cleanup_expired_html_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM raw_html_cache 
    WHERE expires_at < NOW()
    RETURNING COUNT(*) INTO deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired cache (if using pg_cron)
-- SELECT cron.schedule('cleanup-html-cache', '0 2 * * *', 'SELECT cleanup_expired_html_cache();');