import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEvolutionApi } from '@/hooks/useEvolutionApi';
import { getLogger } from '@/lib/logger';

const log = getLogger('useEvolutionAutoReconnect');

/**
 * Hook que monitora as conexões e tenta reconectar instâncias que caíram
 * ou entraram em estado de 'phantom session'.
 * Inclui agora suporte a logs de auditoria e proteção de loop.
 */
export function useEvolutionAutoReconnect() {
  const { restartInstance } = useEvolutionApi();
  const attemptMap = useRef<Record<string, number>>({});
  const lastAttemptTime = useRef<Record<string, number>>({});

  useEffect(() => {
    // Escuta mudanças em tempo real na tabela de conexões
    const channel = supabase
      .channel('reconnect-monitor')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'whatsapp_connections' },
        (payload) => {
          const connection = payload.new as any;
          const oldConnection = payload.old as any;
          
          // Verificações de política e segurança
          if (!connection.auto_reconnect_enabled || connection.loop_protection_active) return;

          const isDisconnected = connection.status === 'disconnected';
          const isPhantom = connection.health_reason === 'phantom_session' || connection.health_reason === 'socket_closed';
          const wasConnected = oldConnection.status === 'connected';
          
          if ((isDisconnected || isPhantom) && connection.instance_id && wasConnected) {
            void attemptReconnect(connection);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const attemptReconnect = async (connection: any) => {
    const id = connection.id;
    const now = Date.now();
    const lastTime = lastAttemptTime.current[id] || 0;
    const attempts = attemptMap.current[id] || 0;
    
    // Usa configurações da instância ou valores padrão
    const intervalMs = (connection.reconnect_interval_seconds || 30) * 1000;
    const maxAttempts = connection.max_reconnect_attempts || 5;

    if (now - lastTime < intervalMs) return;
    if (attempts >= maxAttempts) {
      log.warn(`Limite de reconexão atingido para ${connection.name}`, { id });
      return;
    }

    log.info(`Reconexão automática para ${connection.name}`, { attempt: attempts + 1 });
    
    lastAttemptTime.current[id] = now;
    attemptMap.current[id] = attempts + 1;

    let result = 'success';
    let errorMsg = null;

    try {
      await restartInstance(connection.instance_id);
      await new Promise(r => setTimeout(r, 5000));
      await supabase.functions.invoke('connection-health-check', {
        body: { instanceName: connection.instance_id },
      });
    } catch (err: any) {
      result = 'failed';
      errorMsg = err.message;
      log.error(`Falha na reconexão de ${connection.name}`, err);
    }

    // Registrar auditoria no banco via RPC para gatilhar detecção de loop
    await supabase.rpc('fn_log_reconnection_attempt', {
      p_connection_id: id,
      p_attempt: attempts + 1,
      p_status_before: connection.status,
      p_reason_before: connection.health_reason,
      p_result: result,
      p_error: errorMsg
    });
  };

  // Reset de tentativas caso a instância volte a ficar online
  useEffect(() => {
    const channel = supabase
      .channel('reconnect-reset')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'whatsapp_connections', filter: 'status=eq.connected' },
        (payload) => {
          const connection = payload.new as any;
          if (attemptMap.current[connection.id]) {
            log.info(`Instância ${connection.name} normalizada.`);
            delete attemptMap.current[connection.id];
            delete lastAttemptTime.current[connection.id];
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}

