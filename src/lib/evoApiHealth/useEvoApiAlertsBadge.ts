import { useMemo } from 'react';
import { useActiveAlerts } from './hooks';
import type { ActiveAlert } from './types';

export interface EvoApiAlertsBadge {
  critical: number;
  warning: number;
  info: number;
  total: number;
  /** Highest severity present (drives badge color). */
  topSeverity: 'critical' | 'warning' | 'info' | null;
}

/**
 * Aggregates active `evo_api` alerts into counts per severity for sidebar
 * badges. Reuses the polling query (`useActiveAlerts` — 15s refetch) so the
 * badge updates without opening the panel.
 *
 * Safe to call from any authenticated context: when the user lacks proxy
 * access the underlying query simply returns no data and the badge stays at
 * zero.
 */
export function useEvoApiAlertsBadge(): EvoApiAlertsBadge {
  const { data } = useActiveAlerts();

  return useMemo(() => {
    const list = (data ?? []) as ActiveAlert[];
    let critical = 0;
    let warning = 0;
    let info = 0;
    for (const a of list) {
      if (a.severity === 'critical') critical++;
      else if (a.severity === 'warning') warning++;
      else if (a.severity === 'info') info++;
    }
    const topSeverity =
      critical > 0 ? 'critical' : warning > 0 ? 'warning' : info > 0 ? 'info' : null;
    return { critical, warning, info, total: list.length, topSeverity };
  }, [data]);
}
