-- 1. Digital Categories
CREATE TABLE IF NOT EXISTS digital_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Digital Products (Mirrors wholesale API items)
CREATE TABLE IF NOT EXISTS digital_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES digital_categories(id) ON DELETE SET NULL,
  provider_api_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  retail_price_usd NUMERIC NOT NULL,
  wholesale_price_usd NUMERIC,
  stock INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_api_id)
);

-- 3. Digital Orders (Purchase History)
CREATE TABLE IF NOT EXISTS digital_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES digital_products(id) ON DELETE SET NULL,
  provider_api_id TEXT,
  product_name TEXT,
  price_paid_usd NUMERIC NOT NULL,
  currency_used TEXT NOT NULL DEFAULT 'USD',
  account_logs TEXT NOT NULL, -- The actual credentials retrieved from provider
  status TEXT NOT NULL DEFAULT 'Completed', -- 'Completed', 'Issue Reported', 'Refunded'
  issue_reported_at TIMESTAMPTZ,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if digital_orders was created earlier
ALTER TABLE digital_orders ADD COLUMN IF NOT EXISTS provider_api_id TEXT;
ALTER TABLE digital_orders ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE digital_orders ADD COLUMN IF NOT EXISTS issue_reported_at TIMESTAMPTZ;

-- RLS Policies
ALTER TABLE digital_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'digital_categories' AND policyname = 'Public can view active digital categories'
  ) THEN
    CREATE POLICY "Public can view active digital categories" ON digital_categories FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'digital_products' AND policyname = 'Public can view active digital products'
  ) THEN
    CREATE POLICY "Public can view active digital products" ON digital_products FOR SELECT USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'digital_orders' AND policyname = 'Users can view own digital orders'
  ) THEN
    CREATE POLICY "Users can view own digital orders" ON digital_orders FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. RPC to safely deduct funds and log the order using correct 'wallets' table
CREATE OR REPLACE FUNCTION buy_digital_good(
  p_user_id UUID,
  p_product_id UUID,
  p_cost NUMERIC,
  p_currency TEXT,
  p_account_logs TEXT,
  p_provider_api_id TEXT DEFAULT NULL,
  p_product_name TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance_ngn NUMERIC;
  v_order_id UUID;
BEGIN
  -- 1. Check user balance in correct 'wallets' table
  SELECT balance_ngn INTO v_balance_ngn FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_balance_ngn IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_balance_ngn < p_cost THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- 2. Deduct funds from wallets
  UPDATE wallets 
  SET balance_ngn = balance_ngn - p_cost,
      updated_at = NOW() 
  WHERE user_id = p_user_id;

  -- 3. Insert order record
  INSERT INTO digital_orders (
    user_id, product_id, provider_api_id, product_name, price_paid_usd, currency_used, account_logs, status
  )
  VALUES (
    p_user_id, p_product_id, p_provider_api_id, p_product_name, p_cost, p_currency, p_account_logs, 'Completed'
  )
  RETURNING id INTO v_order_id;

  -- 4. Create transaction log
  INSERT INTO transactions (user_id, amount, type, description, status, currency)
  VALUES (
    p_user_id, p_cost, 'Purchase', 
    'Purchased digital asset: ' || COALESCE(p_product_name, 'Account Log'), 
    'Completed', p_currency
  );

  RETURN json_build_object('success', true, 'order_id', v_order_id);
END;
$$;

-- 5. Helper RPC to decrement stock locally
CREATE OR REPLACE FUNCTION decrement_product_stock(p_product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE digital_products
  SET stock = GREATEST(stock - 1, 0)
  WHERE id = p_product_id;
END;
$$;
