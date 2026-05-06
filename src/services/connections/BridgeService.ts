import { externalSupabase } from '@/integrations/supabase/externalClient';
import { log } from '@/lib/logger';
import { HealthRow, BridgeStatus } from '@/components/connections/types';

/**
 * Serviço para lidar com a comunicação com o Supabase Externo (Fator X).
 */
export class BridgeService {
  static async checkHealth(): Promise<{ health: HealthRow | null; error: string | null; status: BridgeStatus }> {
    if (!externalSupabase) {
      return { health: null, error: 'Cliente externo não configurado.', status: 'offline' };
    }

    try {
      const { data, error: qErr } = await externalSupabase
        .from('v_webhook_health')
        .select('*')
        .limit(1);

      if (qErr) throw qErr;
      
      return { 
        health: (data?.[0] as HealthRow) ?? null, 
        error: null, 
        status: 'online' 
      };
    } catch (e) {
      log.error('[BridgeService] health check failed', e);
      return { 
        health: null, 
        error: e instanceof Error ? e.message : 'Falha ao verificar.', 
        status: 'offline' 
      };
    }
  }
}
