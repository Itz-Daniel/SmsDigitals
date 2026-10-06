-- Add long-term rental controls to settings and api_settings tables
ALTER TABLE settings ADD COLUMN IF NOT EXISTS rental_min_floor_usd NUMERIC DEFAULT 0.80;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS rental_daily_rate_usd NUMERIC DEFAULT 0.50;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS rental_margin_percent NUMERIC DEFAULT 30;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_settings') THEN
    ALTER TABLE api_settings ADD COLUMN IF NOT EXISTS rental_min_floor_usd NUMERIC DEFAULT 0.80;
    ALTER TABLE api_settings ADD COLUMN IF NOT EXISTS rental_daily_rate_usd NUMERIC DEFAULT 0.50;
    ALTER TABLE api_settings ADD COLUMN IF NOT EXISTS rental_margin_percent NUMERIC DEFAULT 30;
  END IF;
END $$;
