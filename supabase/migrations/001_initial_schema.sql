-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Manufacturers table (always Porsche for now)
CREATE TABLE manufacturers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Models table (911, 718, Cayenne, etc.)
CREATE TABLE models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manufacturer_id UUID REFERENCES manufacturers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50), -- Coupe, Convertible, SUV, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(manufacturer_id, name)
);

-- Generations table (992, 991, 718, etc.)
CREATE TABLE generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    start_year INTEGER,
    end_year INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(model_id, name)
);

-- Trims table (GT3, GT3 RS, Turbo, Base, etc.)
CREATE TABLE trims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    generation_id UUID REFERENCES generations(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    is_high_performance BOOLEAN DEFAULT FALSE,
    min_realistic_price INTEGER, -- Minimum realistic price for validation
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(model_id, generation_id, name)
);

-- Model years table
CREATE TABLE model_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    trim_id UUID REFERENCES trims(id) ON DELETE CASCADE,
    generation_id UUID REFERENCES generations(id) ON DELETE SET NULL,
    year INTEGER NOT NULL,
    msrp INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(model_id, trim_id, year)
);

-- Colors table
CREATE TABLE colors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    is_pts BOOLEAN DEFAULT FALSE, -- Paint to Sample
    hex_code VARCHAR(7),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Options master table
CREATE TABLE options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL UNIQUE,
    category VARCHAR(100), -- Performance, Comfort, Aesthetic, etc.
    typical_price INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listings table - the core data
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vin VARCHAR(17) UNIQUE,
    model_year_id UUID REFERENCES model_years(id),
    trim_id UUID REFERENCES trims(id),
    generation_id UUID REFERENCES generations(id),
    
    -- Listing details
    title TEXT,
    price INTEGER NOT NULL,
    mileage INTEGER,
    exterior_color_id UUID REFERENCES colors(id),
    interior_color VARCHAR(100),
    transmission VARCHAR(50),
    
    -- Source information
    source VARCHAR(50) NOT NULL, -- bat, cars, cargurus, etc.
    source_url TEXT,
    source_id VARCHAR(200), -- External ID from source
    
    -- Location
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    dealer_name VARCHAR(200),
    is_dealer BOOLEAN DEFAULT TRUE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, sold, removed, expired
    sold_date DATE,
    sold_price INTEGER,
    
    -- Metadata
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    removed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Raw data
    raw_data JSONB, -- Store original scraped data
    html_archive_path TEXT, -- Path to archived HTML in storage
    
    -- Processed flags
    is_normalized BOOLEAN DEFAULT FALSE,
    normalized_at TIMESTAMPTZ,
    
    -- Validation
    is_valid BOOLEAN DEFAULT TRUE,
    validation_errors JSONB
);

-- Listing options junction table
CREATE TABLE listing_options (
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    option_id UUID REFERENCES options(id) ON DELETE CASCADE,
    PRIMARY KEY (listing_id, option_id)
);

-- Price history tracking
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    vin VARCHAR(17),
    price INTEGER NOT NULL,
    observed_at TIMESTAMPTZ DEFAULT NOW(),
    source VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingestion runs tracking
CREATE TABLE ingestion_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(50) NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'running', -- running, completed, failed
    total_fetched INTEGER DEFAULT 0,
    total_processed INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,
    error_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User accounts (Supabase Auth integration)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    subscription_status VARCHAR(50) DEFAULT 'free', -- free, premium, cancelled
    subscription_id TEXT, -- Stripe subscription ID
    subscription_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved searches
CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    filters JSONB NOT NULL,
    alert_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User tracking for specific VINs
CREATE TABLE watched_vins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    vin VARCHAR(17) NOT NULL,
    notes TEXT,
    alert_on_price_drop BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, vin)
);

-- Analytics events
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    properties JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_listings_vin ON listings(vin);
CREATE INDEX idx_listings_source ON listings(source);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_model_year ON listings(model_year_id);
CREATE INDEX idx_listings_trim ON listings(trim_id);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_mileage ON listings(mileage);
CREATE INDEX idx_listings_state ON listings(state);
CREATE INDEX idx_listings_first_seen ON listings(first_seen_at);
CREATE INDEX idx_price_history_vin ON price_history(vin);
CREATE INDEX idx_price_history_listing ON price_history(listing_id);
CREATE INDEX idx_price_history_observed ON price_history(observed_at);

-- Create views for common queries
CREATE VIEW active_listings AS
SELECT 
    l.*,
    m.name as model_name,
    t.name as trim_name,
    g.name as generation_name,
    my.year,
    c.name as color_name,
    c.is_pts as is_paint_to_sample
FROM listings l
JOIN model_years my ON l.model_year_id = my.id
JOIN models m ON my.model_id = m.id
LEFT JOIN trims t ON l.trim_id = t.id
LEFT JOIN generations g ON l.generation_id = g.id
LEFT JOIN colors c ON l.exterior_color_id = c.id
WHERE l.status = 'active';

-- Create materialized view for market statistics
CREATE MATERIALIZED VIEW market_stats AS
SELECT 
    my.model_id,
    my.trim_id,
    my.year,
    COUNT(DISTINCT l.id) as listing_count,
    AVG(l.price) as avg_price,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY l.price) as median_price,
    MIN(l.price) as min_price,
    MAX(l.price) as max_price,
    AVG(l.mileage) as avg_mileage,
    DATE(NOW()) as calculated_date
FROM listings l
JOIN model_years my ON l.model_year_id = my.id
WHERE l.status = 'active' 
    AND l.is_valid = TRUE
    AND l.price IS NOT NULL
    AND l.price > 10000 -- Filter out obvious errors
GROUP BY my.model_id, my.trim_id, my.year;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_manufacturers_updated_at BEFORE UPDATE ON manufacturers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_generations_updated_at BEFORE UPDATE ON generations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trims_updated_at BEFORE UPDATE ON trims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_model_years_updated_at BEFORE UPDATE ON model_years
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_colors_updated_at BEFORE UPDATE ON colors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_options_updated_at BEFORE UPDATE ON options
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saved_searches_updated_at BEFORE UPDATE ON saved_searches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();