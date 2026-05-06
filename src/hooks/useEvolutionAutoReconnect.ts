import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEvolutionApi } from '@/hooks/useEvolutionApi';
import { getLogger } from '@/lib/logger';

const log = getLogger('useEvolutionAutoReconnect');

// Configuração da estratégia de reconexão
const RECONNECT_INTERVAL = 30000; // 30 segundos
const MAX_AUTO_ATTEMPTS = 5;

/**
 * Hook que monitora as conexões e tenta reconectar instâncias que caíram
 * ou entraram em estado de 'phantom session' (sessão fantasma).
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
          
          // Se o status mudou para disconnected ou o motivo de saúde é crítico
          const isDisconnected = connection.status === 'disconnected';
          const isPhantom = connection.health_reason === 'phantom_session' || connection.health_reason === 'socket_closed';
          const wasConnected = oldConnection.status === 'connected';
          
          if ((isDisconnected || isPhantom) && connection.instance_id && wasConnected) {
            void attemptReconnect(connection.id, connection.instance_id, connection.name);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const attemptReconnect = async (id: string, instanceId: string, name: string) => {
    const now = Date.now();
    const lastTime = lastAttemptTime.current[id] || 0;
    const attempts = attemptMap.current[id] || 0;

    // Evita tentativas muito frequentes ou excessivas
    if (now - lastTime < RECONNECT_INTERVAL) return;
    if (attempts >= MAX_AUTO_ATTEMPTS) {
      log.warn(`Limite de reconexão automática atingido para ${name}`, { id });
      return;
    }

    log.info(`Iniciando reconexão automática para ${name}`, { instanceId, attempt: attempts + 1 });
    
    lastAttemptTime.current[id] = now;
    attemptMap.current[id] = attempts + 1;

    try {
      // 1. Tenta reiniciar a instância na Evolution API
      await restartInstance(instanceId);
      
      // 2. Aguarda um tempo para processamento
      await new Promise(r => setTimeout(r, 5000));
      
      // 3. Dispara o health check no Supabase
      await supabase.functions.invoke('connection-health-check', {
        body: { instanceName: instanceId },
      });
      
      log.info(`Comando de reconexão enviado para ${name}`);
    } catch (err) {
      log.error(`Falha na reconexão automática de ${name}`, err);
    }
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
            log.info(`Instância ${connection.name} normalizada. Resetando contador de reconexão.`);
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
