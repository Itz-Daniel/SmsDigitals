-- 1. Create long_term_rentals table
CREATE TABLE IF NOT EXISTS long_term_rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_order_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  service TEXT NOT NULL,
  country TEXT NOT NULL,
  price_paid NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  expires_at TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'Expired', 'Cancelled', 'Refunded'
  incoming_sms JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure incoming_sms column exists on existing tables
ALTER TABLE long_term_rentals ADD COLUMN IF NOT EXISTS incoming_sms JSONB NOT NULL DEFAULT '[]'::jsonb;

-- RLS
ALTER TABLE long_term_rentals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'long_term_rentals' AND policyname = 'Users can view their own long term rentals'
  ) THEN
    CREATE POLICY "Users can view their own long term rentals"
      ON long_term_rentals FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'long_term_rentals' AND policyname = 'Users can update their own long term rentals (e.g. auto_renew)'
  ) THEN
    CREATE POLICY "Users can update their own long term rentals (e.g. auto_renew)"
      ON long_term_rentals FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 2. RPC to safely buy long term rental with correct 'wallets' table
CREATE OR REPLACE FUNCTION buy_long_term_rental(
  p_user_id UUID,
  p_provider TEXT,
  p_provider_order_id TEXT,
  p_phone_number TEXT,
  p_service TEXT,
  p_country TEXT,
  p_cost NUMERIC,
  p_currency TEXT,
  p_expires_at TIMESTAMPTZ,
  p_auto_renew BOOLEAN
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance_ngn NUMERIC;
  v_rental_id UUID;
BEGIN
  -- 1. Check user balance in correct 'wallets' table
  SELECT balance_ngn INTO v_balance_ngn FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_balance_ngn IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_balance_ngn < p_cost THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- 2. Deduct funds
  UPDATE wallets 
  SET balance_ngn = balance_ngn - p_cost,
      updated_at = NOW() 
  WHERE user_id = p_user_id;

  -- 3. Insert rental record
  INSERT INTO long_term_rentals (
    user_id, provider, provider_order_id, phone_number, service, country, 
    price_paid, currency, expires_at, auto_renew, status, incoming_sms
  )
  VALUES (
    p_user_id, p_provider, p_provider_order_id, p_phone_number, p_service, p_country, 
    p_cost, p_currency, p_expires_at, p_auto_renew, 'Active', '[]'::jsonb
  )
  RETURNING id INTO v_rental_id;

  -- 4. Create transaction log
  INSERT INTO transactions (user_id, amount, type, description, status, currency)
  VALUES (
    p_user_id, p_cost, 'Purchase', 
    'Dedicated Rental: ' || p_service || ' (' || p_phone_number || ')', 
    'Completed', p_currency
  );

  RETURN json_build_object('success', true, 'rental_id', v_rental_id);
END;
$$;

-- 3. RPC for backend to safely refund a long term rental
CREATE OR REPLACE FUNCTION refund_long_term_rental(p_rental_id UUID, p_reason TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rental RECORD;
BEGIN
  -- 1. Get the rental details
  SELECT * INTO v_rental FROM long_term_rentals WHERE id = p_rental_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Rental not found');
  END IF;

  IF v_rental.status = 'Refunded' THEN
    RETURN json_build_object('success', false, 'error', 'Rental is already refunded');
  END IF;

  -- 2. Refund funds to wallet
  UPDATE wallets 
  SET balance_ngn = balance_ngn + v_rental.price_paid,
      updated_at = NOW()
  WHERE user_id = v_rental.user_id;

  -- 3. Update rental status
  UPDATE long_term_rentals 
  SET status = 'Refunded', updated_at = NOW()
  WHERE id = p_rental_id;

  -- 4. Create transaction log
  INSERT INTO transactions (user_id, amount, type, description, status, currency)
  VALUES (
    v_rental.user_id, v_rental.price_paid, 'Refund', 
    'Refund for ' || v_rental.service || ' rental (' || p_reason || ')', 
    'Completed', v_rental.currency
  );

  RETURN json_build_object('success', true);
END;
$$;

-- 4. RPC for backend to safely charge a renewal
CREATE OR REPLACE FUNCTION renew_long_term_rental(
  p_rental_id UUID,
  p_cost NUMERIC,
  p_new_expires_at TIMESTAMPTZ
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rental RECORD;
  v_balance_ngn NUMERIC;
BEGIN
  -- 1. Get the rental
  SELECT * INTO v_rental FROM long_term_rentals WHERE id = p_rental_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Rental not found');
  END IF;

  -- 2. Check balance
  SELECT balance_ngn INTO v_balance_ngn FROM wallets WHERE user_id = v_rental.user_id FOR UPDATE;
  IF v_balance_ngn IS NULL OR v_balance_ngn < p_cost THEN
    UPDATE long_term_rentals SET auto_renew = false, updated_at = NOW() WHERE id = p_rental_id;
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- 3. Deduct funds
  UPDATE wallets 
  SET balance_ngn = balance_ngn - p_cost, 
      updated_at = NOW() 
  WHERE user_id = v_rental.user_id;

  -- 4. Update rental
  UPDATE long_term_rentals 
  SET expires_at = p_new_expires_at, updated_at = NOW()
  WHERE id = p_rental_id;

  -- 5. Transaction
  INSERT INTO transactions (user_id, amount, type, description, status, currency)
  VALUES (
    v_rental.user_id, p_cost, 'Purchase', 
    'Rental Renewal: ' || v_rental.service || ' (' || v_rental.phone_number || ')', 
    'Completed', v_rental.currency
  );

  RETURN json_build_object('success', true);
END;
$$;
