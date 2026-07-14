-- Migration to add lifetime deposits for VIP Tiers tracking
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS lifetime_deposits_usd NUMERIC(15, 2) DEFAULT 0.00;

-- Optionally, backfill lifetime_deposits_usd from transactions if any exist
UPDATE wallets w
SET lifetime_deposits_usd = COALESCE(
  (
    SELECT SUM(
      CASE 
        WHEN t.currency = 'USD' THEN t.amount
        WHEN t.currency = 'NGN' THEN t.amount / COALESCE((SELECT exchange_rate FROM api_settings LIMIT 1), 1500)
        ELSE 0
      END
    )
    FROM transactions t
    WHERE t.user_id = w.user_id
    AND t.type = 'Funding'
    AND t.status = 'Success'
  ), 
  0.00
)
WHERE w.lifetime_deposits_usd = 0.00;
