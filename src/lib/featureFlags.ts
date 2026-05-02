/**
 * Feature flags system for ZAPP WEB.
 *
 * Allows enabling/disabling features at runtime without deploying.
 * Flags are stored in Supabase `app_settings` table and cached locally.
 * Falls back to defaults when Supabase is unreachable.
 */

import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';

type FeatureFlag =
  | 'ai_agents'
  | 'sla_siren'
  | 'semantic_search'
  | 'voip_sip'
  | 'email_channel'
  | 'instagram_channel'
  | 'telegram_channel'
  | 'csat_surveys'
  | 'media_library'
  | 'talk_x'
  | 'optimistic_messages'
  | 'auto_retry_failed'
  | 'whisper_mode'
  | 'dark_mode';

const DEFAULTS: Record<FeatureFlag, boolean> = {
  ai_agents: true,
  sla_siren: true,
  semantic_search: true,
  voip_sip: true,
  email_channel: true,
  instagram_channel: true,
  telegram_channel: true,
  csat_surveys: true,
  media_library: true,
  talk_x: true,
  optimistic_messages: true,
  auto_retry_failed: true,
  whisper_mode: true,
  dark_mode: true,
};

let flagCache: Record<string, boolean> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a feature is enabled.
 * Uses cached values, falling back to defaults.
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  if (flagCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return flagCache[flag] ?? DEFAULTS[flag];
  }
  return DEFAULTS[flag];
}

/**
 * Load feature flags from Supabase.
 * Call once on app init and periodically to refresh.
 */
export async function loadFeatureFlags(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .like('key', 'feature_%');

    if (error) throw error;

    const flags: Record<string, boolean> = { ...DEFAULTS };
    if (data) {
      for (const row of data) {
        const flagName = row.key.replace('feature_', '');
        flags[flagName] = row.value === 'true' || row.value === true;
      }
    }

    flagCache = flags;
    cacheTimestamp = Date.now();
    log.info('[FeatureFlags] Loaded', Object.keys(flags).length, 'flags');
  } catch (err) {
    log.warn('[FeatureFlags] Failed to load, using defaults:', err);
    // Keep using defaults or stale cache
  }
}

/**
 * Get all flags for debugging / admin panel.
 */
export function getAllFlags(): Record<FeatureFlag, boolean> {
  if (flagCache) {
    return { ...DEFAULTS, ...flagCache } as Record<FeatureFlag, boolean>;
  }
  return { ...DEFAULTS };
}
