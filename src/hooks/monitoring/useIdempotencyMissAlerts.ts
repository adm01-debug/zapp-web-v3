/**
 * useIdempotencyMissAlerts — admin-only watchdog for the Evolution send cache.
 *
 * Polls FATOR X `evolution_audit_log` for `idempotency_miss` rows in the last
 * hour, groups them by `instance_name`, and raises a `warroom_alerts` row when
 * any instance crosses the configured threshold. Reuses the existing siren /
 * push notification flow via `useWarRoomAlerts`.
 *
 * Why poll instead of subscribe? `evolution_audit_log` lives on FATOR X, which
 * does not share a Realtime channel with the Lovable Cloud where the alerts
 * are stored. A 60s poll is acceptable: misses are a low-frequency signal and
 * the alert is hourly-bucketed.
 *
 * Returns the live miss counts per instance so the Connections page can show
 * an inline badge alongside the toast.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryExternalProxy } from '@/lib/externalProxy';
import { useUserRole } from '@/hooks/useUserRole';
import { getLogger } from '@/lib/logger';

const log = getLogger('useIdempotencyMissAlerts');

/** Misses per instance per hour above this raise an alert. Tunable per env. */
export const DEFAULT_MISS_THRESHOLD = 50;
const POLL_INTERVAL_MS = 60_000;
const ALERT_DEDUPE_KEY_PREFIX = 'idempotency-miss';

interface AuditLogRow {
  id: string;
  action: string;
  metadata: { instance_name?: string | null; path?: string | null } | null;
  created_at: string;
}

export interface InstanceMissCount {
  instance: string;
  count: number;
  overThreshold: boolean;
}

interface UseIdempotencyMissAlertsOptions {
  /** Override the per-instance threshold. */
  threshold?: number;
  /** Disable polling (e.g. for tests or non-admin users). */
  enabled?: boolean;
}

export function useIdempotencyMissAlerts(opts: UseIdempotencyMissAlertsOptions = {}) {
  const { threshold = DEFAULT_MISS_THRESHOLD } = opts;
  const { isAdmin, loading: roleLoading } = useUserRole();
  const enabled = (opts.enabled ?? true) && isAdmin && !roleLoading;
  const [lastAlertedAt, setLastAlertedAt] = useState<Map<string, number>>(new Map());

  const { data, isFetching, error } = useQuery({
    queryKey: ['idempotency-miss', 'last-hour'],
    enabled,
    refetchInterval: enabled ? POLL_INTERVAL_MS : false,
    staleTime: POLL_INTERVAL_MS / 2,
    queryFn: async (): Promise<AuditLogRow[]> => {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const result = await queryExternalProxy<AuditLogRow>({
        table: 'evolution_audit_log',
        select: 'id, action, metadata, created_at',
        filters: [
          { column: 'action', operator: 'eq', value: 'idempotency_miss' },
          { column: 'created_at', operator: 'gte', value: since },
        ],
        order: { column: 'created_at', ascending: false },
        limit: 1000,
      });
      return result.data ?? [];
    },
  });

  const counts = useMemo<InstanceMissCount[]>(() => {
    if (!data) return [];
    const byInstance = new Map<string, number>();
    for (const row of data) {
      const inst = (row.metadata?.instance_name ?? 'unknown').trim() || 'unknown';
      byInstance.set(inst, (byInstance.get(inst) ?? 0) + 1);
    }
    return Array.from(byInstance.entries())
      .map(([instance, count]) => ({
        instance,
        count,
        overThreshold: count >= threshold,
      }))
      .sort((a, b) => b.count - a.count);
  }, [data, threshold]);

  // Raise a warroom alert per breaching instance, deduped to once per hour.
  useEffect(() => {
    if (!enabled || counts.length === 0) return;
    const breaching = counts.filter((c) => c.overThreshold);
    if (breaching.length === 0) return;

    const now = Date.now();
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const next = new Map(lastAlertedAt);
    let changed = false;

    void (async () => {
      for (const item of breaching) {
        const dedupeKey = `${ALERT_DEDUPE_KEY_PREFIX}:${item.instance}`;
        const lastTs = next.get(dedupeKey) ?? 0;
        if (now - lastTs < ONE_HOUR_MS) continue;

        try {
          const { error: insertErr } = await supabase.from('warroom_alerts').insert({
            alert_type: 'warning',
            title: `Cache de idempotência: ${item.count} miss/h em ${item.instance}`,
            message:
              `A instância "${item.instance}" registrou ${item.count} cache misses ` +
              `na última hora (limite: ${threshold}). Verifique a tabela ` +
              `evolution_send_idempotency e o TTL configurado.`,
            source: dedupeKey,
          });
          if (insertErr) {
            // RLS will block non-admins/supervisors — silent in that case.
            log.debug('warroom_alerts insert blocked or failed:', insertErr.message);
          } else {
            next.set(dedupeKey, now);
            changed = true;
          }
        } catch (e) {
          log.warn('failed to raise idempotency-miss alert:', e);
        }
      }
      if (changed) setLastAlertedAt(next);
    })();
  }, [counts, enabled, lastAlertedAt, threshold]);

  return {
    counts,
    threshold,
    isLoading: isFetching && !data,
    error: error instanceof Error ? error.message : null,
    enabled,
  };
}
