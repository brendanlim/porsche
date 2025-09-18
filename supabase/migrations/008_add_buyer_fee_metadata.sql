-- Add buyer fee metadata columns to track fees applied to listings
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS buyer_fee_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS buyer_fee_applied BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS price_before_fee DECIMAL(10,2);

-- Add comments for clarity
COMMENT ON COLUMN listings.buyer_fee_amount IS 'Amount of buyer fee applied (e.g., BaT 5% capped at $7500)';
COMMENT ON COLUMN listings.buyer_fee_applied IS 'Whether buyer fee has been included in the price';
COMMENT ON COLUMN listings.price_before_fee IS 'Original price before buyer fee was added';

-- Create index for finding listings that need fee updates
CREATE INDEX IF NOT EXISTS idx_listings_buyer_fee_applied ON listings(source, buyer_fee_applied) 
WHERE source IN ('bring-a-trailer', 'bat');