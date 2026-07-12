-- 1. Decouple digital_orders from digital_products
ALTER TABLE digital_orders DROP CONSTRAINT IF EXISTS digital_orders_product_id_fkey;
ALTER TABLE digital_orders ALTER COLUMN product_id DROP NOT NULL;

-- 2. Add columns for dynamic product tracking and issue reporting
ALTER TABLE digital_orders 
ADD COLUMN IF NOT EXISTS provider_api_id TEXT,
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS issue_reported_at TIMESTAMPTZ;

-- 3. Update the buy_digital_good RPC to use dynamic product details
CREATE OR REPLACE FUNCTION buy_digital_good(
  p_user_id UUID,
  p_provider_api_id TEXT,
  p_product_name TEXT,
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
  INSERT INTO digital_orders (user_id, provider_api_id, product_name, price_paid_usd, currency_used, account_logs, status)
  VALUES (p_user_id, p_provider_api_id, p_product_name, p_cost, p_currency, p_account_logs, 'Completed')
  RETURNING id INTO v_order_id;

  -- 4. Create transaction log
  INSERT INTO transactions (user_id, amount, type, description, status)
  VALUES (p_user_id, p_cost, 'digital_purchase', 'Purchased ' || p_product_name, 'Completed');

  RETURN json_build_object('success', true, 'order_id', v_order_id);
END;
$$;

-- 4. Admin RPC to approve refunds for reported issues
CREATE OR REPLACE FUNCTION refund_digital_order(p_order_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_balance NUMERIC;
BEGIN
  -- 1. Get the order details
  SELECT * INTO v_order FROM digital_orders WHERE id = p_order_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status = 'Refunded' THEN
    RETURN json_build_object('success', false, 'error', 'Order is already refunded');
  END IF;

  -- 2. Refund funds to wallet
  UPDATE user_wallets 
  SET balance = balance + v_order.price_paid_usd 
  WHERE user_id = v_order.user_id;

  -- 3. Update order status
  UPDATE digital_orders 
  SET status = 'Refunded' 
  WHERE id = p_order_id;

  -- 4. Create transaction log
  INSERT INTO transactions (user_id, amount, type, description, status)
  VALUES (v_order.user_id, v_order.price_paid_usd, 'refund', 'Refund for ' || COALESCE(v_order.product_name, 'digital product'), 'Completed');

  RETURN json_build_object('success', true);
END;
$$;
