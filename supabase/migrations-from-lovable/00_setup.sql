-- ═══════════════════════════════════════════════════════════
-- 00_SETUP: Extensions + Enums + Roles
-- ═══════════════════════════════════════════════════════════

-- Extensions (idempotente)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
-- pg_cron e pg_net são gerenciados pelo Supabase self-hosted;
-- comentar se já estiverem habilitados no painel:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Enums (7) — IF NOT EXISTS via DO block

DO $$ BEGIN
  CREATE TYPE public.ai_provider_type AS ENUM ('lovable_ai', 'openai_compatible', 'google_gemini', 'custom_webhook', 'custom_agent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'supervisor', 'agent', 'special_agent', 'dev');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.automation_execution_status AS ENUM ('pending', 'accepted', 'dismissed', 'executed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.automation_trigger_type AS ENUM ('first_response_pending', 'inactivity', 'tag_applied', 'tag_removed', 'keyword_match');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.channel_type AS ENUM ('whatsapp', 'instagram', 'telegram', 'messenger', 'webchat', 'email');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.provider_type AS ENUM ('evolution', 'wppconnect', 'baileys', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.service_account_type AS ENUM ('google_sheets', 'google_docs', 'google_calendar', 'google_drive', 'dropbox');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
