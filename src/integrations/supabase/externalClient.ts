/**
 * External Supabase Client — bancodadosclientes (pgxfvjmuubtbowutlide)
 * 
 * Connects to the CRM database that holds the full 360° contact data:
 * companies, customers, interactions, RFM scores, DISC profiles, etc.
 * 
 * Uses environment variables:
 *   VITE_EXTERNAL_SUPABASE_URL
 *   VITE_EXTERNAL_SUPABASE_ANON_KEY
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = import.meta.env.VITE_EXTERNAL_SUPABASE_URL || '';
const EXTERNAL_SUPABASE_ANON_KEY = import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY || '';

export const isExternalConfigured = Boolean(EXTERNAL_SUPABASE_URL && EXTERNAL_SUPABASE_ANON_KEY);

export const externalSupabase: SupabaseClient | null = isExternalConfigured
  ? createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'x-client-info': 'zapp-web-external-360',
        },
      },
    })
  : null;

/**
 * Returns the external client, throwing if not configured.
 * Use only after checking `isExternalConfigured`.
 */
export function getExternalSupabase(): SupabaseClient {
  if (!externalSupabase) {
    throw new Error('External Supabase is not configured. Set VITE_EXTERNAL_SUPABASE_URL and VITE_EXTERNAL_SUPABASE_ANON_KEY.');
  }
  return externalSupabase;
}