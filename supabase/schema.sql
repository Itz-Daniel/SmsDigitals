-- ==========================================
-- BLISSDIGITALS BACKEND SCHEMA & FUNCTIONS
-- ==========================================

-- 1. PROFILES (Tied to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WALLETS (One-to-One with Profiles)
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance_ngn NUMERIC(15, 2) DEFAULT 0.00 CHECK (balance_ngn >= 0),
  balance_usd NUMERIC(15, 2) DEFAULT 0.00 CHECK (balance_usd >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TRANSACTIONS (Immutable Ledger)
CREATE TYPE transaction_type AS ENUM ('Funding', 'Debit', 'Refund');
CREATE TYPE transaction_status AS ENUM ('Pending', 'Success', 'Failed');
CREATE TYPE currency_type AS ENUM ('NGN', 'USD');

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type transaction_type NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  currency currency_type NOT NULL,
  status transaction_status NOT NULL DEFAULT 'Pending',
  reference TEXT UNIQUE NOT NULL, -- Paystack Ref or SMSPool Order ID
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RENTALS (Virtual Numbers)
CREATE TYPE rental_status AS ENUM ('Waiting', 'Received', 'Cancelled');

CREATE TABLE rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  order_id TEXT UNIQUE NOT NULL, -- SMSPool Order ID
  phone_number TEXT NOT NULL,
  service TEXT NOT NULL,
  status rental_status NOT NULL DEFAULT 'Waiting',
  sms_code TEXT,
  cost NUMERIC(15, 2) NOT NULL,
  currency currency_type NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- AUTOMATIC ACCOUNT CREATION (TRIGGER)
-- ==========================================
-- This automatically creates a profile and a $0 wallet when a user registers.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  
  INSERT INTO public.wallets (user_id, balance_ngn, balance_usd)
  VALUES (new.id, 0.00, 0.00);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- SECURITY: ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can view own wallet" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own rentals" ON rentals FOR SELECT USING (auth.uid() = user_id);

-- ==========================================
-- FAIL-SAFE FUNCTIONS (Preventing Double-Spend & Double-Refund)
-- ==========================================

-- Function to safely deduct wallet balance for a rental
CREATE OR REPLACE FUNCTION rent_number(
  p_user_id UUID, 
  p_cost NUMERIC, 
  p_currency currency_type, 
  p_order_id TEXT, 
  p_phone TEXT, 
  p_service TEXT, 
  p_expires_at TIMESTAMPTZ
) RETURNS JSON AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_new_balance NUMERIC;
BEGIN
  -- 1. Lock the wallet row to prevent race conditions
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  -- 2. Check balance
  IF p_currency = 'NGN' THEN
    IF v_wallet.balance_ngn < p_cost THEN
      RAISE EXCEPTION 'Insufficient NGN balance';
    END IF;
    v_new_balance := v_wallet.balance_ngn - p_cost;
    UPDATE wallets SET balance_ngn = v_new_balance, updated_at = NOW() WHERE id = v_wallet.id;
  ELSE
    IF v_wallet.balance_usd < p_cost THEN
      RAISE EXCEPTION 'Insufficient USD balance';
    END IF;
    v_new_balance := v_wallet.balance_usd - p_cost;
    UPDATE wallets SET balance_usd = v_new_balance, updated_at = NOW() WHERE id = v_wallet.id;
  END IF;

  -- 3. Log the transaction (Debit)
  INSERT INTO transactions (user_id, type, amount, currency, status, reference, description)
  VALUES (p_user_id, 'Debit', p_cost, p_currency, 'Success', p_order_id, 'Virtual Number — ' || p_service);

  -- 4. Create the rental record
  INSERT INTO rentals (user_id, order_id, phone_number, service, cost, currency, expires_at)
  VALUES (p_user_id, p_order_id, p_phone, p_service, p_cost, p_currency, p_expires_at);

  RETURN json_build_object('success', true, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to safely refund a cancelled rental
CREATE OR REPLACE FUNCTION refund_rental(p_order_id TEXT) RETURNS JSON AS $$
DECLARE
  v_rental rentals%ROWTYPE;
  v_wallet wallets%ROWTYPE;
BEGIN
  -- 1. Lock the rental row to prevent DOUBLE REFUNDS (e.g. user clicks cancel same time webhook arrives)
  SELECT * INTO v_rental FROM rentals WHERE order_id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rental not found';
  END IF;

  -- 2. Ensure it's still "Waiting". If it's already Cancelled or Received, DO NOTHING.
  IF v_rental.status != 'Waiting' THEN
    RETURN json_build_object('success', false, 'message', 'Rental already processed');
  END IF;

  -- 3. Update rental status
  UPDATE rentals SET status = 'Cancelled' WHERE id = v_rental.id;

  -- 4. Lock wallet and refund
  SELECT * INTO v_wallet FROM wallets WHERE user_id = v_rental.user_id FOR UPDATE;
  
  IF v_rental.currency = 'NGN' THEN
    UPDATE wallets SET balance_ngn = balance_ngn + v_rental.cost, updated_at = NOW() WHERE id = v_wallet.id;
  ELSE
    UPDATE wallets SET balance_usd = balance_usd + v_rental.cost, updated_at = NOW() WHERE id = v_wallet.id;
  END IF;

  -- 5. Log the transaction (Refund)
  INSERT INTO transactions (user_id, type, amount, currency, status, reference, description)
  VALUES (v_rental.user_id, 'Refund', v_rental.cost, v_rental.currency, 'Success', 'REF-' || p_order_id, 'Refund for expired number');

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
