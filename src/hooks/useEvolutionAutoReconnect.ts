import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEvolutionApi } from '@/hooks/useEvolutionApi';
import { getLogger } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { eventBus } from '@/lib/eventBus';

const log = getLogger('useEvolutionAutoReconnect');

const INITIAL_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 60000; 

/**
 * useEvolutionAutoReconnect — Definitive Reconnection Hook
 * Consolidates global monitoring via Realtime (Supabase) 
 * and specific instance polling with backoff for the Inbox.
 */
export function useEvolutionAutoReconnect(instanceName?: string) {
  const { restartInstance, getInstanceStatus, connectInstance } = useEvolutionApi();
  const queryClient = useQueryClient();
  const attemptMap = useRef<Record<string, number>>({});
  const lastAttemptTime = useRef<Record<string, number>>({});

  // Local state for specific instance monitoring (e.g. in Inbox)
  const [status, setStatus] = useState<string>('unknown');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Global Realtime Monitoring ───────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('evolution-reconnect-monitor')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'whatsapp_connections' },
        (payload) => {
          const connection = payload.new as any;
          const oldConnection = payload.old as any;
          
          if (!connection.auto_reconnect_enabled || connection.loop_protection_active) return;

          const isDisconnected = connection.status === 'disconnected';
          const isPhantom = connection.health_reason === 'phantom_session' || connection.health_reason === 'socket_closed';
          const wasConnected = oldConnection.status === 'connected';
          
          if ((isDisconnected || isPhantom) && connection.instance_id && wasConnected) {
            void performReconnect(connection);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const performReconnect = async (connection: any) => {
    const id = connection.id;
    const now = Date.now();
    const lastTime = lastAttemptTime.current[id] || 0;
    const attempts = attemptMap.current[id] || 0;
    
    const intervalMs = (connection.reconnect_interval_seconds || 30) * 1000;
    const maxAttempts = connection.max_reconnect_attempts || 5;

    if (now - lastTime < intervalMs) return;
    if (attempts >= maxAttempts) {
      log.warn(`Reconnection limit reached for ${connection.name}`, { id });
      return;
    }

    log.info(`Auto-reconnecting ${connection.name}`, { attempt: attempts + 1 });
    
    lastAttemptTime.current[id] = now;
    attemptMap.current[id] = attempts + 1;

    let result = 'success';
    let errorMsg = null;

    try {
      await restartInstance(connection.instance_id);
      // Wait for instance to boot
      await new Promise(r => setTimeout(r, 5000));
      // Trigger a health check function if exists
      await supabase.functions.invoke('connection-health-check', {
        body: { instanceName: connection.instance_id },
      });
    } catch (err: any) {
      result = 'failed';
      errorMsg = err.message;
      log.error(`Reconnection failed for ${connection.name}`, err);
    }

    // Log to DB
    await supabase.rpc('fn_log_reconnection_attempt', {
      p_connection_id: id,
      p_attempt: attempts + 1,
      p_status_before: connection.status,
      p_reason_before: connection.health_reason,
      p_result: result,
      p_error: errorMsg
    });
  };

  // ── Specific Instance Polling (Legacy/Inbox Support) ──────────────────────
  const attemptSpecificReconnect = useCallback(async () => {
    if (!instanceName || isReconnecting) return;
    
    setIsReconnecting(true);
    log.info(`Attempting to reconnect specific instance ${instanceName}...`);
    
    try {
      await connectInstance(instanceName);
      setTimeout(async () => {
        const currentStatus = await getInstanceStatus(instanceName);
        const state = currentStatus?.instance?.state || currentStatus?.state || 'unknown';
        setStatus(state);
        
        if (state === 'open') {
          log.info(`Successfully reconnected instance ${instanceName}`);
          backoffRef.current = INITIAL_BACKOFF_MS;
          setIsReconnecting(false);
          queryClient.invalidateQueries({ queryKey: ['external-evolution'] });
          eventBus.emit('connection:recovered', { instanceName });
        } else {
          scheduleNextAttempt();
        }
      }, 5000);
    } catch (err) {
      log.error(`Failed to reconnect instance ${instanceName}:`, err);
      scheduleNextAttempt();
    }
  }, [instanceName, connectInstance, getInstanceStatus, queryClient, isReconnecting]);

  const scheduleNextAttempt = useCallback(() => {
    setIsReconnecting(false);
    const nextDelay = Math.min(backoffRef.current * 2, 60000);
    backoffRef.current = nextDelay;
    
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(attemptSpecificReconnect, nextDelay);
  }, [attemptSpecificReconnect]);

  const checkStatus = useCallback(async () => {
    if (!instanceName) return;
    try {
      const currentStatus = await getInstanceStatus(instanceName);
      const state = currentStatus?.instance?.state || currentStatus?.state || 'unknown';
      setStatus(state);
      
      if (state !== 'open' && state !== 'connecting' && !isReconnecting) {
        attemptSpecificReconnect();
      }
    } catch (err) {
      log.error(`Error checking status for ${instanceName}:`, err);
    }
  }, [instanceName, getInstanceStatus, attemptSpecificReconnect, isReconnecting]);

  useEffect(() => {
    if (!instanceName) return;
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [checkStatus, instanceName]);

  return { status, isReconnecting };
}

