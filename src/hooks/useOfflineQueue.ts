import { useCallback, useRef, useState } from 'react';
import { log } from '@/lib/logger';

interface QueuedAction {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

/**
 * Offline-tolerant action queue.
 *
 * When the network is down, actions (message sends, status updates, etc.)
 * are queued and automatically replayed when connectivity returns.
 *
 * This prevents data loss when agents are working in areas with
 * spotty internet (common in Brazil with mobile hotspots).
 */
export function useOfflineQueue() {
  const queueRef = useRef<QueuedAction[]>([]);
  const [queueLength, setQueueLength] = useState(0);
  const processingRef = useRef(false);

  const enqueue = useCallback(
    (type: string, payload: Record<string, unknown>): string => {
      const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      queueRef.current.push({
        id,
        type,
        payload,
        timestamp: Date.now(),
        retries: 0,
      });
      setQueueLength(queueRef.current.length);
      log.info(`[OfflineQueue] Enqueued ${type} (${queueRef.current.length} pending)`);
      return id;
    },
    [],
  );

  const processQueue = useCallback(
    async (handler: (action: QueuedAction) => Promise<boolean>) => {
      if (processingRef.current || queueRef.current.length === 0) return;
      processingRef.current = true;

      const remaining: QueuedAction[] = [];

      for (const action of queueRef.current) {
        try {
          const success = await handler(action);
          if (!success) {
            action.retries++;
            if (action.retries < 5) {
              remaining.push(action);
            } else {
              log.error(`[OfflineQueue] Dropped ${action.type} after 5 retries`);
            }
          }
        } catch {
          action.retries++;
          if (action.retries < 5) remaining.push(action);
        }
      }

      queueRef.current = remaining;
      setQueueLength(remaining.length);
      processingRef.current = false;

      log.info(`[OfflineQueue] Processed, ${remaining.length} remaining`);
    },
    [],
  );

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    setQueueLength(0);
  }, []);

  return {
    enqueue,
    processQueue,
    clearQueue,
    queueLength,
    hasItems: queueLength > 0,
  };
}
