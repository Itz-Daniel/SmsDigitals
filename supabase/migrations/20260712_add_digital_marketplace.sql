-- 1. Digital Categories
CREATE TABLE IF NOT EXISTS digital_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Digital Products (Mirrors the wholesale API items)
CREATE TABLE IF NOT EXISTS digital_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES digital_categories(id) ON DELETE SET NULL,
  provider_api_id TEXT NOT NULL, -- The ID the wholesale provider uses
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
  price_paid_usd NUMERIC NOT NULL,
  currency_used TEXT NOT NULL,
  account_logs TEXT NOT NULL, -- The actual username/password retrieved from API
  status TEXT NOT NULL DEFAULT 'Completed',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE digital_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active digital categories" ON digital_categories FOR SELECT USING (true);
CREATE POLICY "Public can view active digital products" ON digital_products FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view own digital orders" ON digital_orders FOR SELECT USING (auth.uid() = user_id);

-- 4. RPC to safely deduct funds and log the order
CREATE OR REPLACE FUNCTION buy_digital_good(
  p_user_id UUID,
  p_product_id UUID,
  p_cost NUMERIC,
  p_currency TEXT,
  p_account_logs TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance NUMERIC;
  v_order_id UUID;
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

  -- 3. Insert order record
  INSERT INTO digital_orders (user_id, product_id, price_paid_usd, currency_used, account_logs)
  VALUES (p_user_id, p_product_id, p_cost, p_currency, p_account_logs)
  RETURNING id INTO v_order_id;

  -- 4. Create transaction log
  INSERT INTO transactions (user_id, amount, type, description, status)
  VALUES (p_user_id, p_cost, 'digital_purchase', 'Purchased digital product', 'Completed');

  RETURN json_build_object('success', true, 'order_id', v_order_id);
END;
$$;

-- 5. Helper RPC to decrement stock locally (optional caching layer)
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
