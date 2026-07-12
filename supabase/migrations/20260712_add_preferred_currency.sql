-- Migration to add preferred_currency to profiles
ALTER TABLE public.profiles
ADD COLUMN preferred_currency TEXT DEFAULT 'NGN' NOT NULL;

ALTER TABLE public.profiles
ADD CONSTRAINT check_preferred_currency CHECK (preferred_currency IN ('NGN', 'USD'));
