/**
 * useDedupeIntrospect — assina o snapshot de chaves/locks ativos do
 * crossTabDedupe + telemetria de hits/misses, com refresh por intervalo.
 *
 * Read-only: nunca muta estado do dedupe. Pode rodar em painéis sem efeitos
 * colaterais.
 */
import { useEffect, useState } from 'react';
import {
  getDedupeIntrospectSnapshot,
  type DedupeIntrospectSnapshot,
} from '@/lib/realtime/crossTabDedupe';
import {
  getDedupeTelemetrySnapshot,
  type DedupeTelemetrySnapshot,
} from '@/lib/realtime/dedupeTelemetry';

export interface DedupeDiagnosticsData {
  introspect: DedupeIntrospectSnapshot;
  telemetry: DedupeTelemetrySnapshot;
}

function read(): DedupeDiagnosticsData {
  return {
    introspect: getDedupeIntrospectSnapshot(),
    telemetry: getDedupeTelemetrySnapshot(),
  };
}

export function useDedupeIntrospect(refreshMs = 1500): DedupeDiagnosticsData {
  const [data, setData] = useState<DedupeDiagnosticsData>(() => read());

  useEffect(() => {
    if (refreshMs <= 0) return;
    const id = setInterval(() => setData(read()), refreshMs);
    return () => clearInterval(id);
  }, [refreshMs]);

  return data;
}
