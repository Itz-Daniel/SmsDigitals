-- Affiliate System Migration
-- 1. Add settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS affiliate_percentage NUMERIC DEFAULT 5.0;

-- 2. Add columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS affiliate_earnings NUMERIC DEFAULT 0;

-- 3. Function to generate a random 8-character string for referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER := 0;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 4. Trigger to auto-generate referral code on insert
CREATE OR REPLACE FUNCTION set_referral_code_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        -- Keep generating until unique
        LOOP
            NEW.referral_code := generate_referral_code();
            BEGIN
                -- attempt to exit loop
                EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = NEW.referral_code);
            EXCEPTION WHEN unique_violation THEN
                -- loop again if constraint violated
            END;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_referral_code ON profiles;
CREATE TRIGGER trigger_set_referral_code
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_referral_code_on_insert();

-- 5. Backfill existing profiles with referral codes
DO $$
DECLARE
    prof RECORD;
    new_code TEXT;
BEGIN
    FOR prof IN SELECT id FROM profiles WHERE referral_code IS NULL LOOP
        LOOP
            new_code := generate_referral_code();
            EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_code);
        END LOOP;
        
        UPDATE profiles SET referral_code = new_code WHERE id = prof.id;
    END LOOP;
END;
$$;

-- 6. RPC Function for Affiliate Payout
CREATE OR REPLACE FUNCTION process_affiliate_payout(
    p_user_id UUID,
    p_deposit_amount NUMERIC,
    p_reference TEXT
) RETURNS VOID AS $$
DECLARE
    v_referrer_id UUID;
    v_percentage NUMERIC;
    v_bonus_amount NUMERIC;
BEGIN
    -- 1. Check if user has a referrer
    SELECT referred_by INTO v_referrer_id FROM profiles WHERE id = p_user_id;
    
    IF v_referrer_id IS NOT NULL THEN
        -- 2. Get the current affiliate percentage
        SELECT COALESCE(affiliate_percentage, 5.0) INTO v_percentage FROM settings LIMIT 1;
        
        -- 3. Calculate bonus
        v_bonus_amount := p_deposit_amount * (v_percentage / 100);
        
        -- 4. Credit the referrer's wallet directly
        UPDATE profiles SET balance = balance + v_bonus_amount WHERE id = v_referrer_id;
        
        -- 5. Update their total earnings tracker
        UPDATE profiles SET affiliate_earnings = affiliate_earnings + v_bonus_amount WHERE id = v_referrer_id;
        
        -- Note: We append '_AFFILIATE' to the reference to avoid collision if they use the same ref table
        -- We could also log this to a transactions table if one exists.
    END IF;
END;
$$ LANGUAGE plpgsql;
