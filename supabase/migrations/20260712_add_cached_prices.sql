-- Create the cached_prices table
CREATE TABLE IF NOT EXISTS cached_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  service TEXT NOT NULL,
  lowest_raw_cost NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(country, service)
);

-- Allow public read access to cached prices
ALTER TABLE cached_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read cached prices" ON cached_prices FOR SELECT USING (true);

-- Create a function to upsert cached prices safely
CREATE OR REPLACE FUNCTION upsert_cached_price(
  p_country TEXT,
  p_service TEXT,
  p_lowest_raw_cost NUMERIC
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO cached_prices (country, service, lowest_raw_cost, updated_at)
  VALUES (p_country, p_service, p_lowest_raw_cost, NOW())
  ON CONFLICT (country, service) 
  DO UPDATE SET 
    lowest_raw_cost = EXCLUDED.lowest_raw_cost,
    updated_at = EXCLUDED.updated_at;
END;
$$;
