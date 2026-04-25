/**
 * useDedupeMetrics — Hook reativo para métricas de eficiência cross-tab.
 *
 * Diferente de `useDedupeIntrospect` (que faz polling do snapshot completo
 * de locks/results), este hook se inscreve diretamente no emitter da
 * telemetria — atualiza o componente apenas quando um novo evento chega.
 *
 * Use para KPIs leves (cache hit, leader vs follower, latência) que devem
 * estar sempre atualizados sem custo de timer.
 */
import { useSyncExternalStore } from 'react';
import {
  getDedupeTelemetrySnapshot,
  subscribeDedupeTelemetry,
  type DedupeTelemetrySnapshot,
} from '@/lib/realtime/dedupeTelemetry';

const subscribe = (cb: () => void) => subscribeDedupeTelemetry(cb);
const getSnapshot = (): DedupeTelemetrySnapshot => getDedupeTelemetrySnapshot();

export function useDedupeMetrics(): DedupeTelemetrySnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
