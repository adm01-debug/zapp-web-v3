import { useState, useEffect, useCallback, useRef } from 'react';
import { useEvolutionApi } from './useEvolutionApi';
import { getLogger } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';

const log = getLogger('useEvolutionAutoReconnection');

const INITIAL_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 60000; // 1 minute
const CHECK_INTERVAL_MS = 30000; // Check status every 30s

export function useEvolutionAutoReconnection(instanceName: string = 'wpp2') {
  const { getInstanceStatus, connectInstance } = useEvolutionApi();
  const [status, setStatus] = useState<string>('unknown');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const backoffRef = useRef(INITIAL_BACKOFF_MS);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  const attemptReconnect = useCallback(async () => {
    if (isReconnecting) return;
    
    setIsReconnecting(true);
    log.info(`Attempting to reconnect instance ${instanceName}...`);
    
    try {
      await connectInstance(instanceName);
      // Wait a bit and check status
      setTimeout(async () => {
        const currentStatus = await getInstanceStatus(instanceName);
        const state = currentStatus?.instance?.state || currentStatus?.state || 'unknown';
        setStatus(state);
        
        if (state === 'open') {
          log.info(`Successfully reconnected instance ${instanceName}`);
          backoffRef.current = INITIAL_BACKOFF_MS;
          setIsReconnecting(false);
          
          // Recovery of conversation state: force refetch of conversations and messages
          log.info('Recovering conversation state after reconnection...');
          queryClient.invalidateQueries({ queryKey: ['external-evolution'] });
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
    const nextDelay = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
    backoffRef.current = nextDelay;
    
    log.info(`Scheduling next reconnection attempt in ${nextDelay}ms`);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(attemptReconnect, nextDelay);
  }, [attemptReconnect]);

  const checkStatus = useCallback(async () => {
    try {
      const currentStatus = await getInstanceStatus(instanceName);
      const state = currentStatus?.instance?.state || currentStatus?.state || 'unknown';
      setStatus(state);
      
      if (state !== 'open' && state !== 'connecting' && !isReconnecting) {
        log.warn(`Instance ${instanceName} is ${state}. Starting auto-reconnection...`);
        attemptReconnect();
      }
    } catch (err) {
      log.error(`Error checking status for ${instanceName}:`, err);
    }
  }, [instanceName, getInstanceStatus, attemptReconnect, isReconnecting]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, CHECK_INTERVAL_MS);
    
    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [checkStatus]);

  return { status, isReconnecting };
}
