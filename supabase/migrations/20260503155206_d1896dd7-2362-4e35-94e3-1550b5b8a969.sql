-- Add theme_config to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_config JSONB DEFAULT '{}'::jsonb;
