-- Seed Porsche manufacturer
INSERT INTO manufacturers (name) VALUES ('Porsche');

-- Get Porsche ID for foreign keys
WITH porsche AS (SELECT id FROM manufacturers WHERE name = 'Porsche')

-- Insert models
INSERT INTO models (manufacturer_id, name, model_type)
SELECT porsche.id, model.name, model.model_type
FROM porsche,
(VALUES 
    ('911', 'Coupe'),
    ('718 Cayman', 'Coupe'),
    ('718 Boxster', 'Convertible'),
    ('Cayenne', 'SUV'),
    ('Macan', 'SUV'),
    ('Panamera', 'Sedan'),
    ('Taycan', 'Sedan')
) AS model(name, model_type);

-- Insert generations for 911
WITH model_911 AS (SELECT id FROM models WHERE name = '911')
INSERT INTO generations (model_id, name, start_year, end_year)
SELECT model_911.id, gen.name, gen.start_year, gen.end_year
FROM model_911,
(VALUES
    ('993', 1995, 1998),
    ('996', 1999, 2004),
    ('997', 2005, 2011),
    ('991.1', 2012, 2015),
    ('991.2', 2016, 2019),
    ('992.1', 2020, 2023),
    ('992.2', 2024, NULL)
) AS gen(name, start_year, end_year);

-- Insert generations for 718
WITH model_718_cayman AS (SELECT id FROM models WHERE name = '718 Cayman')
INSERT INTO generations (model_id, name, start_year, end_year)
SELECT model_718_cayman.id, gen.name, gen.start_year, gen.end_year
FROM model_718_cayman,
(VALUES
    ('981', 2016, 2019),
    ('982', 2020, NULL)
) AS gen(name, start_year, end_year);

WITH model_718_boxster AS (SELECT id FROM models WHERE name = '718 Boxster')
INSERT INTO generations (model_id, name, start_year, end_year)
SELECT model_718_boxster.id, gen.name, gen.start_year, gen.end_year
FROM model_718_boxster,
(VALUES
    ('981', 2016, 2019),
    ('982', 2020, NULL)
) AS gen(name, start_year, end_year);

-- Insert trims for 911 - GT MODELS HAVE HIGH PRIORITY!
WITH model_911 AS (SELECT id FROM models WHERE name = '911'),
     gen_992_1 AS (SELECT id FROM generations WHERE name = '992.1'),
     gen_992_2 AS (SELECT id FROM generations WHERE name = '992.2')
INSERT INTO trims (model_id, generation_id, name, is_high_performance, min_realistic_price)
SELECT model_911.id, generation_id, trim_name, is_high_perf, min_price
FROM model_911,
(VALUES
    -- GT MODELS - CROWN JEWELS
    ((SELECT id FROM generations WHERE name = '992.1'), 'GT3', TRUE, 150000),
    ((SELECT id FROM generations WHERE name = '992.1'), 'GT3 RS', TRUE, 250000),
    ((SELECT id FROM generations WHERE name = '992.1'), 'GT3 Touring', TRUE, 160000),
    ((SELECT id FROM generations WHERE name = '992.2'), 'GT3', TRUE, 180000),
    ((SELECT id FROM generations WHERE name = '992.2'), 'GT3 RS', TRUE, 300000),
    ((SELECT id FROM generations WHERE name = '991.1'), 'GT3', TRUE, 120000),
    ((SELECT id FROM generations WHERE name = '991.1'), 'GT3 RS', TRUE, 180000),
    ((SELECT id FROM generations WHERE name = '991.2'), 'GT3', TRUE, 140000),
    ((SELECT id FROM generations WHERE name = '991.2'), 'GT3 RS', TRUE, 200000),
    ((SELECT id FROM generations WHERE name = '991.2'), 'GT2 RS', TRUE, 400000),
    ((SELECT id FROM generations WHERE name = '997'), 'GT3', TRUE, 100000),
    ((SELECT id FROM generations WHERE name = '997'), 'GT3 RS', TRUE, 150000),
    ((SELECT id FROM generations WHERE name = '997'), 'GT2', TRUE, 180000),
    ((SELECT id FROM generations WHERE name = '997'), 'GT2 RS', TRUE, 350000),
    -- Regular trims
    ((SELECT id FROM generations WHERE name = '992.1'), 'Carrera', FALSE, 80000),
    ((SELECT id FROM generations WHERE name = '992.1'), 'Carrera S', FALSE, 100000),
    ((SELECT id FROM generations WHERE name = '992.1'), 'Carrera 4S', FALSE, 110000),
    ((SELECT id FROM generations WHERE name = '992.1'), 'Turbo', TRUE, 150000),
    ((SELECT id FROM generations WHERE name = '992.1'), 'Turbo S', TRUE, 180000),
    ((SELECT id FROM generations WHERE name = '992.2'), 'Carrera', FALSE, 100000)
) AS trim_data(generation_id, trim_name, is_high_perf, min_price);

-- Insert trims for 718 Cayman
WITH model_718 AS (SELECT id FROM models WHERE name = '718 Cayman'),
     gen_982 AS (SELECT id FROM generations WHERE name = '982' AND model_id = (SELECT id FROM models WHERE name = '718 Cayman'))
INSERT INTO trims (model_id, generation_id, name, is_high_performance, min_realistic_price)
SELECT model_718.id, gen_982.id, trim_name, is_high_perf, min_price
FROM model_718, gen_982,
(VALUES
    ('Base', FALSE, 45000),
    ('S', FALSE, 60000),
    ('GTS', FALSE, 70000),
    ('GTS 4.0', TRUE, 80000),
    ('GT4', TRUE, 90000),
    ('GT4 RS', TRUE, 180000)
) AS trim_data(trim_name, is_high_perf, min_price);

-- Insert trims for 718 Boxster
WITH model_718 AS (SELECT id FROM models WHERE name = '718 Boxster'),
     gen_982 AS (SELECT id FROM generations WHERE name = '982' AND model_id = (SELECT id FROM models WHERE name = '718 Boxster'))
INSERT INTO trims (model_id, generation_id, name, is_high_performance, min_realistic_price)
SELECT model_718.id, gen_982.id, trim_name, is_high_perf, min_price
FROM model_718, gen_982,
(VALUES
    ('Base', FALSE, 50000),
    ('S', FALSE, 65000),
    ('GTS', FALSE, 75000),
    ('GTS 4.0', TRUE, 85000),
    ('Spyder', TRUE, 95000),
    ('Spyder RS', TRUE, 200000)
) AS trim_data(trim_name, is_high_perf, min_price);

-- Insert common colors
INSERT INTO colors (name, is_pts, hex_code)
VALUES
    -- Standard colors
    ('Black', FALSE, '#000000'),
    ('White', FALSE, '#FFFFFF'),
    ('Carrara White', FALSE, '#F5F5F5'),
    ('GT Silver', FALSE, '#B5B5B5'),
    ('Agate Grey', FALSE, '#6B6B6B'),
    ('Chalk', FALSE, '#E8E6E1'),
    ('Guards Red', FALSE, '#CC0000'),
    ('Carmine Red', FALSE, '#B70E0E'),
    ('Racing Yellow', FALSE, '#FFD500'),
    ('Speed Yellow', FALSE, '#FAE800'),
    ('Miami Blue', FALSE, '#00B0FF'),
    ('Shark Blue', FALSE, '#001F3D'),
    ('Gentian Blue', FALSE, '#2B4C8C'),
    ('Sapphire Blue', FALSE, '#162C5D'),
    
    -- Paint to Sample colors
    ('Granite Green', TRUE, '#4A5A4F'),
    ('Dark Sea Blue', TRUE, '#1F3A5F'),
    ('Oslo Blue', TRUE, '#2C4E6C'),
    ('Mexico Blue', TRUE, '#00A8E1'),
    ('Voodoo Blue', TRUE, '#4B9BFF'),
    ('Nardo Grey', TRUE, '#686C75'),
    ('Fashion Grey', TRUE, '#7C7D7F'),
    ('Slate Grey', TRUE, '#4A4F54'),
    ('Signal Yellow', TRUE, '#FAB700'),
    ('Signal Green', TRUE, '#00FF00'),
    ('Acid Green', TRUE, '#BFFF00'),
    ('Lizard Green', TRUE, '#7FAF00'),
    ('Ruby Star', TRUE, '#A01959'),
    ('Python Green', TRUE, '#5FA05A');

-- Insert common options
INSERT INTO options (name, category, typical_price)
VALUES
    -- Performance
    ('Porsche Ceramic Composite Brakes (PCCB)', 'Performance', 9210),
    ('Sport Chrono Package', 'Performance', 2090),
    ('Porsche Dynamic Chassis Control (PDCC)', 'Performance', 3170),
    ('Rear Axle Steering', 'Performance', 2090),
    ('Porsche Active Suspension Management (PASM)', 'Performance', 1790),
    ('Sport Exhaust System', 'Performance', 2930),
    ('Weissach Package', 'Performance', 18000),
    ('Lightweight Package', 'Performance', 10900),
    
    -- Comfort/Convenience
    ('Adaptive Cruise Control', 'Comfort', 2090),
    ('Lane Keep Assist', 'Comfort', 690),
    ('Bose Surround Sound System', 'Audio', 1590),
    ('Burmester High-End Surround Sound System', 'Audio', 4560),
    ('Heated Seats', 'Comfort', 530),
    ('Ventilated Seats', 'Comfort', 1020),
    ('Power Seats (14-way)', 'Comfort', 2320),
    ('Power Seats (18-way)', 'Comfort', 3080),
    
    -- Interior
    ('Full Leather Interior', 'Interior', 4530),
    ('Extended Leather Interior', 'Interior', 5900),
    ('Carbon Fiber Interior Package', 'Interior', 5200),
    ('Deviated Stitching', 'Interior', 1530),
    ('Lightweight Bucket Seats', 'Interior', 5900),
    
    -- Exterior
    ('Paint to Sample', 'Exterior', 11430),
    ('Carbon Fiber Roof', 'Exterior', 4420),
    ('Front Axle Lift System', 'Exterior', 2770),
    ('LED Matrix Headlights', 'Exterior', 3150),
    ('Tinted Windows', 'Exterior', 690),
    
    -- Wheels
    ('20" Carrera S Wheels', 'Wheels', 0),
    ('20" RS Spyder Wheels', 'Wheels', 1650),
    ('21" Sport Design Wheels', 'Wheels', 3970),
    ('Center Lock Wheels', 'Wheels', 1270),
    ('Satin Black Wheels', 'Wheels', 1790);

-- Create model years for recent years
DO $$
DECLARE
    model_rec RECORD;
    trim_rec RECORD;
    year_val INTEGER;
BEGIN
    FOR model_rec IN SELECT id FROM models LOOP
        FOR trim_rec IN SELECT id FROM trims WHERE model_id = model_rec.id LOOP
            FOR year_val IN 2020..2024 LOOP
                INSERT INTO model_years (model_id, trim_id, year)
                VALUES (model_rec.id, trim_rec.id, year_val)
                ON CONFLICT (model_id, trim_id, year) DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;