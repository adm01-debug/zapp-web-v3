/**
 * Resolves which edge function should receive a "send" call:
 *  - `evolution-api`        for Evolution / Baileys connections (default)
 *  - `whatsapp-cloud-api`   for WhatsApp Cloud API (Meta) connections
 *
 * Lookup is by `whatsapp_connections.instance_id` (which we already use as
 * the `instanceName` everywhere). Result is cached in-memory for 60s to
 * avoid round-trips on every send.
 *
 * This is the ONLY place that knows about the api_type split. The Inbox,
 * hooks, and message senders remain agnostic.
 */
import { supabase } from '@/integrations/supabase/client';

type FnName = 'evolution-api' | 'whatsapp-cloud-api';

interface CacheEntry { fn: FnName; expiresAt: number; }
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

export async function resolveSendFunction(instanceName: string | undefined | null): Promise<FnName> {
  if (!instanceName) return 'evolution-api';
  const cached = cache.get(instanceName);
  if (cached && cached.expiresAt > Date.now()) return cached.fn;

  try {
    const { data } = await supabase
      .from('whatsapp_connections')
      .select('api_type')
      .eq('instance_id', instanceName)
      .maybeSingle();
    const fn: FnName = (data?.api_type === 'official') ? 'whatsapp-cloud-api' : 'evolution-api';
    cache.set(instanceName, { fn, expiresAt: Date.now() + TTL_MS });
    return fn;
  } catch {
    return 'evolution-api';
  }
}

/** Test/debug helper. */
export function clearSendFunctionCache() { cache.clear(); }
