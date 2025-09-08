-- Add simple color columns to listings table
-- The original schema used color_id references, but we're storing colors as text

-- Add exterior_color column if it doesn't exist
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS exterior_color VARCHAR(100);

-- The interior_color column already exists in the original schema

-- Update any existing data that might be using the old color_id
-- (This is safe to run even if there's no data)
UPDATE listings 
SET exterior_color = c.name 
FROM colors c 
WHERE listings.exterior_color_id = c.id 
AND listings.exterior_color IS NULL;

-- We can keep the exterior_color_id column for backwards compatibility
-- or drop it if no longer needed:
-- ALTER TABLE listings DROP COLUMN IF EXISTS exterior_color_id;