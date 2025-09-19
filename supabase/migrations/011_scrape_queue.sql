-- Create scrape_queue table for managing URL processing
CREATE TABLE IF NOT EXISTS public.scrape_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  model VARCHAR(50),
  trim VARCHAR(100),

  -- Queue management
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, error
  priority INTEGER DEFAULT 2, -- 1 = high priority, 2 = normal, 3 = low
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_at TIMESTAMPTZ,

  -- Results
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  error_message TEXT,

  -- Metadata
  metadata JSONB
);

-- Indexes for efficient queue processing
CREATE INDEX idx_scrape_queue_status ON public.scrape_queue(status);
CREATE INDEX idx_scrape_queue_priority ON public.scrape_queue(priority, created_at);
CREATE INDEX idx_scrape_queue_source ON public.scrape_queue(source);
CREATE UNIQUE INDEX idx_scrape_queue_url ON public.scrape_queue(url);

-- Function to reset stuck processing items (useful for cleanup)
CREATE OR REPLACE FUNCTION reset_stuck_queue_items()
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE scrape_queue
  SET status = 'pending',
      started_at = NULL
  WHERE status = 'processing'
    AND started_at < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- View for queue statistics
CREATE OR REPLACE VIEW scrape_queue_stats AS
SELECT
  source,
  status,
  priority,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM scrape_queue
GROUP BY source, status, priority;