-- Create RPC function to get aggregated analytics for all models and trims
CREATE OR REPLACE FUNCTION get_all_models_analytics()
RETURNS TABLE (
  model TEXT,
  trim TEXT,
  display_model TEXT,
  display_trim TEXT,
  total_listings BIGINT,
  avg_price NUMERIC,
  avg_mileage NUMERIC,
  min_price NUMERIC,
  max_price NUMERIC,
  min_year INTEGER,
  max_year INTEGER,
  price_trend NUMERIC,
  volume_trend NUMERIC,
  last_30_days_listings BIGINT,
  median_days_on_market NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH current_stats AS (
    SELECT 
      l.model,
      l.trim,
      COUNT(*) as listing_count,
      AVG(l.price) as average_price,
      AVG(l.mileage) as average_mileage,
      MIN(l.price) as minimum_price,
      MAX(l.price) as maximum_price,
      MIN(l.year) as minimum_year,
      MAX(l.year) as maximum_year,
      COUNT(CASE WHEN l.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent_listings
    FROM listings l
    WHERE l.model IS NOT NULL
      AND l.price > 15000  -- Filter out bad data
      AND l.status = 'active'
    GROUP BY l.model, l.trim
  ),
  historical_stats AS (
    -- Calculate price trends based on price history
    SELECT 
      l.model,
      l.trim,
      AVG(CASE WHEN ph.created_at > NOW() - INTERVAL '30 days' THEN ph.price END) as recent_avg_price,
      AVG(CASE WHEN ph.created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days' THEN ph.price END) as previous_avg_price
    FROM listings l
    JOIN price_history ph ON l.id = ph.listing_id
    WHERE l.model IS NOT NULL
    GROUP BY l.model, l.trim
  ),
  volume_stats AS (
    -- Calculate volume trends
    SELECT 
      model,
      trim,
      COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent_volume,
      COUNT(CASE WHEN created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days' THEN 1 END) as previous_volume
    FROM listings
    WHERE model IS NOT NULL
    GROUP BY model, trim
  ),
  market_days AS (
    -- Calculate median days on market for sold listings
    SELECT 
      model,
      trim,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (sold_date - created_at))) as median_days
    FROM listings
    WHERE model IS NOT NULL
      AND sold_date IS NOT NULL
      AND sold_date > created_at
    GROUP BY model, trim
  )
  SELECT 
    cs.model,
    cs.trim,
    -- Format display names
    CASE 
      WHEN cs.model = '911' THEN '911'
      WHEN cs.model = '718-cayman' THEN '718 Cayman'
      WHEN cs.model = '718-boxster' THEN '718 Boxster'
      WHEN cs.model = '718-spyder' THEN '718 Spyder'
      ELSE INITCAP(REPLACE(cs.model, '-', ' '))
    END as display_model,
    COALESCE(cs.trim, 'Base') as display_trim,
    cs.listing_count as total_listings,
    ROUND(cs.average_price) as avg_price,
    ROUND(cs.average_mileage) as avg_mileage,
    cs.minimum_price as min_price,
    cs.maximum_price as max_price,
    cs.minimum_year as min_year,
    cs.maximum_year as max_year,
    -- Calculate price trend percentage
    CASE 
      WHEN hs.previous_avg_price > 0 THEN 
        ROUND(((hs.recent_avg_price - hs.previous_avg_price) / hs.previous_avg_price * 100)::numeric, 1)
      ELSE 0
    END as price_trend,
    -- Calculate volume trend percentage
    CASE 
      WHEN vs.previous_volume > 0 THEN 
        ROUND(((vs.recent_volume::numeric - vs.previous_volume) / vs.previous_volume * 100)::numeric, 1)
      ELSE 0
    END as volume_trend,
    cs.recent_listings as last_30_days_listings,
    COALESCE(md.median_days, 0) as median_days_on_market
  FROM current_stats cs
  LEFT JOIN historical_stats hs ON cs.model = hs.model AND COALESCE(cs.trim, '') = COALESCE(hs.trim, '')
  LEFT JOIN volume_stats vs ON cs.model = vs.model AND COALESCE(cs.trim, '') = COALESCE(vs.trim, '')
  LEFT JOIN market_days md ON cs.model = md.model AND COALESCE(cs.trim, '') = COALESCE(md.trim, '')
  ORDER BY cs.model, cs.trim;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_models_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_models_analytics() TO anon;