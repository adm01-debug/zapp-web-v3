import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEvolutionApi } from '@/hooks/useEvolutionApi';
import { normalizePhone, isSamePhone } from '@/lib/phoneUtils';

/**
 * Auto-syncs Evolution API instances into `whatsapp_connections`.
 *
 * When instances exist in Evolution but not in the Supabase table
 * (e.g. created via API/CLI), this hook auto-inserts them so they
 * appear in the Connections page.
 *
 * Protections:
 * - Runs once on mount (idempotent)
 * - Skips instances already in Supabase (by instance_id)
 * - Skips instances whose phone number already exists (prevents duplicates)
 * - Insert-only (never deletes or overwrites)
 */
export function useEvolutionAutoSync(onSynced?: () => void) {
  const ran = useRef(false);
  const { listInstances } = useEvolutionApi();

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        // 1. Get existing connections from Supabase
        const { data: existing } = await supabase
          .from('whatsapp_connections')
          .select('instance_id, phone_number');
        const knownIds = new Set((existing ?? []).map((c) => c.instance_id));
        const knownPhones = (existing ?? [])
          .map((c) => normalizePhone(c.phone_number ?? ''))
          .filter(Boolean);

        // 2. List all Evolution instances
        const evoResult = await listInstances();
        const instances: any[] = Array.isArray(evoResult)
          ? evoResult
          : evoResult?.data ?? evoResult?.instances ?? [];

        if (!instances.length) return;

        // 3. Find instances NOT in Supabase (by instance_id AND phone number)
        const missing = instances.filter((inst) => {
          if (!inst?.instance?.instanceName) return false;
          if (knownIds.has(inst.instance.instanceName)) return false;

          // Also skip if phone number already exists in another connection
          const phone = inst.instance?.number ||
            inst.instance?.ownerJid?.replace('@s.whatsapp.net', '') || '';
          if (phone && knownPhones.some((kp) => isSamePhone(kp, phone))) {
            console.log(`[evo-sync] Skipping ${inst.instance.instanceName} — phone ${phone} already connected via another instance`);
            return false;
          }
          return true;
        });

        if (!missing.length) return;

        // 4. Insert missing instances
        for (const inst of missing) {
          const name =
            inst.instance?.profileName ||
            inst.instance?.instanceName ||
            'Auto-synced';
          const phone =
            inst.instance?.number ||
            inst.instance?.ownerJid?.replace('@s.whatsapp.net', '') ||
            '';
          const status =
            inst.instance?.status === 'open' ? 'connected' : 'disconnected';

          const { error } = await supabase.from('whatsapp_connections').insert({
            name,
            phone_number: phone,
            instance_id: inst.instance.instanceName,
            status,
            is_default: false,
            api_type: 'evolution',
          });

          if (error) {
            console.warn(`[evo-sync] Failed to sync ${inst.instance.instanceName}:`, error.message);
          } else {
            console.log(`[evo-sync] \u2705 Synced: ${inst.instance.instanceName} (${name})`);
          }
        }

        // 5. Refresh connections list
        onSynced?.();
      } catch (err) {
        console.warn('[evo-sync] Auto-sync failed:', err);
      }
    })();
  }, [listInstances, onSynced]);
}
