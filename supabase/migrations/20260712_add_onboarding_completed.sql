-- Add onboarding_completed flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Mark all existing users as having completed onboarding so they don't get the popup
UPDATE profiles SET onboarding_completed = TRUE;
