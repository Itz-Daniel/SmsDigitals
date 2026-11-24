-- Migration: Add account_status and flag_reason to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS flag_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ DEFAULT NULL;
