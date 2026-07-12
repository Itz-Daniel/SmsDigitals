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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE long_term_rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own long term rentals"
  ON long_term_rentals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own long term rentals (e.g. auto_renew)"
  ON long_term_rentals FOR UPDATE
  USING (auth.uid() = user_id);

-- 2. RPC to safely buy long term rental
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
  v_balance NUMERIC;
  v_rental_id UUID;
BEGIN
  -- 1. Check user balance
  SELECT balance INTO v_balance FROM user_wallets WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_balance < p_cost THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- 2. Deduct funds
  UPDATE user_wallets 
  SET balance = balance - p_cost 
  WHERE user_id = p_user_id;

  -- 3. Insert rental record
  INSERT INTO long_term_rentals (user_id, provider, provider_order_id, phone_number, service, country, price_paid, currency, expires_at, auto_renew, status)
  VALUES (p_user_id, p_provider, p_provider_order_id, p_phone_number, p_service, p_country, p_cost, p_currency, p_expires_at, p_auto_renew, 'Active')
  RETURNING id INTO v_rental_id;

  -- 4. Create transaction log
  INSERT INTO transactions (user_id, amount, type, description, status)
  VALUES (p_user_id, p_cost, 'rental_purchase', '1-Month Rental: ' || p_service || ' (' || p_phone_number || ')', 'Completed');

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
  UPDATE user_wallets 
  SET balance = balance + v_rental.price_paid 
  WHERE user_id = v_rental.user_id;

  -- 3. Update rental status
  UPDATE long_term_rentals 
  SET status = 'Refunded' 
  WHERE id = p_rental_id;

  -- 4. Create transaction log
  INSERT INTO transactions (user_id, amount, type, description, status)
  VALUES (v_rental.user_id, v_rental.price_paid, 'refund', 'Refund for ' || v_rental.service || ' rental (' || p_reason || ')', 'Completed');

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
  v_balance NUMERIC;
BEGIN
  -- 1. Get the rental
  SELECT * INTO v_rental FROM long_term_rentals WHERE id = p_rental_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Rental not found');
  END IF;

  -- 2. Check balance
  SELECT balance INTO v_balance FROM user_wallets WHERE user_id = v_rental.user_id FOR UPDATE;
  IF v_balance < p_cost THEN
    -- Toggle off auto-renew if it fails
    UPDATE long_term_rentals SET auto_renew = false WHERE id = p_rental_id;
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- 3. Deduct funds
  UPDATE user_wallets SET balance = balance - p_cost WHERE user_id = v_rental.user_id;

  -- 4. Update rental
  UPDATE long_term_rentals 
  SET expires_at = p_new_expires_at, updated_at = NOW()
  WHERE id = p_rental_id;

  -- 5. Transaction
  INSERT INTO transactions (user_id, amount, type, description, status)
  VALUES (v_rental.user_id, p_cost, 'rental_renewal', 'Renewal: ' || v_rental.service || ' (' || v_rental.phone_number || ')', 'Completed');

  RETURN json_build_object('success', true);
END;
$$;
