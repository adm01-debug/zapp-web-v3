/**
 * Zap Webb — Supabase Client (LEITURA + Realtime)
 *
 * Conecta ao backend self-hosted da Promo Brindes em
 * https://supabase.atomicabr.com.br para leitura das tabelas
 * `evolution_*` e subscrição de eventos em tempo real.
 *
 * Este client é DEDICADO ao domínio Zap Webb e NÃO substitui o
 * client Lovable Cloud (`@/integrations/supabase/client`), que
 * continua responsável por auth/sessão e tabelas internas.
 *
 * ⚠️  Toda ESCRITA de mensagens vai pela Evolution API
 *     (ver `src/integrations/zappweb/evolutionClient.ts`).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const ZAPP_URL =
  import.meta.env.VITE_ZAPPWEB_SUPABASE_URL ||
  import.meta.env.VITE_EXTERNAL_SUPABASE_URL ||
  'https://supabase.atomicabr.com.br';

const ZAPP_ANON =
  import.meta.env.VITE_ZAPPWEB_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.rvamc0XHuSCYB1glBwOCCxgfd9yxWVYLnhFzg5-7TRk';

export const ZAPPWEB_INSTANCE = (import.meta.env.VITE_ZAPPWEB_INSTANCE ||
  'wpp2') as string;

export const zappSupabase: SupabaseClient = createClient(ZAPP_URL, ZAPP_ANON, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { params: { eventsPerSecond: 10 } },
  global: { headers: { 'x-client-info': 'zapp-webb-frontend' } },
});

export const ZAPPWEB_CONFIG = {
  url: ZAPP_URL,
  anonKey: ZAPP_ANON,
  instance: ZAPPWEB_INSTANCE,
} as const;
