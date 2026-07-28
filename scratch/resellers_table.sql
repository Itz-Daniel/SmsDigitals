-- Reseller Storefronts Table Migration Script
CREATE TABLE IF NOT EXISTS public.reseller_storefronts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  store_slug TEXT UNIQUE NOT NULL,
  store_name TEXT NOT NULL,
  logo_url TEXT,
  accent_color TEXT DEFAULT '#0070F3',
  profit_margin_percent NUMERIC DEFAULT 20.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.reseller_storefronts ENABLE ROW LEVEL SECURITY;

-- Allow Public Read Access for Storefront Rendering
CREATE POLICY "Allow public read access for storefronts"
  ON public.reseller_storefronts FOR SELECT USING (true);

-- Allow Owners to Manage Their Storefront
CREATE POLICY "Allow owners to manage storefront"
  ON public.reseller_storefronts FOR ALL USING (auth.uid() = user_id);
