-- Add user cars table for garage functionality
CREATE TABLE user_cars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    vin VARCHAR(17),

    -- Car details (can be filled from VIN lookup or manual entry)
    year INTEGER,
    model_id UUID REFERENCES models(id),
    trim_id UUID REFERENCES trims(id),
    generation_id UUID REFERENCES generations(id),

    -- Physical details
    exterior_color_id UUID REFERENCES colors(id),
    interior_color VARCHAR(100),
    mileage INTEGER,

    -- User-specific data
    purchase_date DATE,
    purchase_price INTEGER,
    purchase_notes TEXT,

    -- Valuation tracking
    last_estimated_value INTEGER,
    last_valuation_date DATE,

    -- User preferences
    nickname VARCHAR(100), -- e.g., "My GT3"
    is_for_sale BOOLEAN DEFAULT FALSE,
    asking_price INTEGER,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(user_id, vin),
    CHECK (year >= 1960 AND year <= EXTRACT(YEAR FROM NOW()) + 2)
);

-- User car options junction table
CREATE TABLE user_car_options (
    user_car_id UUID REFERENCES user_cars(id) ON DELETE CASCADE,
    option_id UUID REFERENCES options(id) ON DELETE CASCADE,
    PRIMARY KEY (user_car_id, option_id)
);

-- Valuation history for user cars
CREATE TABLE user_car_valuations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_car_id UUID REFERENCES user_cars(id) ON DELETE CASCADE,
    estimated_value INTEGER NOT NULL,
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    valuation_method VARCHAR(50), -- 'market_analysis', 'manual', 'ml_prediction'
    market_data_used JSONB, -- Store which listings/comparables were used
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market alerts for users
CREATE TABLE market_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- Alert criteria
    model_id UUID REFERENCES models(id),
    trim_id UUID REFERENCES trims(id),
    generation_id UUID REFERENCES generations(id),
    year_min INTEGER,
    year_max INTEGER,
    price_min INTEGER,
    price_max INTEGER,
    mileage_max INTEGER,
    states TEXT[], -- Array of state codes
    required_options UUID[], -- Array of option IDs

    -- Alert settings
    alert_name VARCHAR(200) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    notify_email BOOLEAN DEFAULT TRUE,
    notify_frequency VARCHAR(20) DEFAULT 'immediate', -- immediate, daily, weekly

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_triggered_at TIMESTAMPTZ
);

-- Alert matches tracking
CREATE TABLE alert_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID REFERENCES market_alerts(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    notified_at TIMESTAMPTZ,

    UNIQUE(alert_id, listing_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_cars_user_id ON user_cars(user_id);
CREATE INDEX idx_user_cars_vin ON user_cars(vin);
CREATE INDEX idx_user_cars_model ON user_cars(model_id);
CREATE INDEX idx_user_cars_trim ON user_cars(trim_id);
CREATE INDEX idx_user_car_valuations_car_id ON user_car_valuations(user_car_id);
CREATE INDEX idx_user_car_valuations_created ON user_car_valuations(created_at);
CREATE INDEX idx_market_alerts_user_id ON market_alerts(user_id);
CREATE INDEX idx_market_alerts_active ON market_alerts(is_active) WHERE is_active = true;
CREATE INDEX idx_alert_matches_alert_id ON alert_matches(alert_id);
CREATE INDEX idx_alert_matches_listing_id ON alert_matches(listing_id);

-- Add trigger for user_cars updated_at
CREATE TRIGGER update_user_cars_updated_at BEFORE UPDATE ON user_cars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_market_alerts_updated_at BEFORE UPDATE ON market_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for user cars with full details
CREATE VIEW user_cars_detailed AS
SELECT
    uc.*,
    m.name as model_name,
    t.name as trim_name,
    g.name as generation_name,
    c.name as exterior_color_name,
    c.hex_code as exterior_color_hex,
    c.is_pts as is_paint_to_sample,

    -- Latest valuation
    (SELECT estimated_value FROM user_car_valuations
     WHERE user_car_id = uc.id
     ORDER BY created_at DESC LIMIT 1) as latest_estimated_value,

    -- Count of options
    (SELECT COUNT(*) FROM user_car_options WHERE user_car_id = uc.id) as options_count,

    -- Market comparison data
    (SELECT COUNT(*) FROM listings l
     JOIN model_years my ON l.model_year_id = my.id
     WHERE my.model_id = uc.model_id
     AND l.trim_id = uc.trim_id
     AND my.year = uc.year
     AND l.status = 'active') as similar_active_listings,

    (SELECT AVG(price) FROM listings l
     JOIN model_years my ON l.model_year_id = my.id
     WHERE my.model_id = uc.model_id
     AND l.trim_id = uc.trim_id
     AND my.year = uc.year
     AND l.status = 'sold'
     AND l.sold_date >= CURRENT_DATE - INTERVAL '90 days') as recent_sold_avg_price

FROM user_cars uc
LEFT JOIN models m ON uc.model_id = m.id
LEFT JOIN trims t ON uc.trim_id = t.id
LEFT JOIN generations g ON uc.generation_id = g.id
LEFT JOIN colors c ON uc.exterior_color_id = c.id;

-- Insert initial subscription tiers if they don't exist
INSERT INTO profiles (id, email, subscription_status)
SELECT id, email, 'free'
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;