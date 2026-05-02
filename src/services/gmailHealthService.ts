
import { safeClient } from '@/integrations/supabase/safeClient';

export interface GmailHealthInfo {
  status: 'healthy' | 'degraded' | 'error';
  lastValidation: Date | null;
  cacheExpiration: number | null;
  recentFailures: Array<{
    requestId: string;
    operation: string;
    resource: string;
    error: string;
    timestamp: string;
  }>;
  stats: {
    totalCalls: number;
    failedCalls: number;
    cacheHits: number;
  };
}

/**
 * Serviço que agrega informações de saúde e telemetria do Gmail via safeClient
 */
export const gmailHealthService = {
  /**
   * Retorna o estado consolidado da saúde do Gmail
   */
  async getHealthStatus(): Promise<GmailHealthInfo> {
    // Pegar métricas do safeClient
    const telemetry = (safeClient as any).getTelemetry?.() || {
      lastValidation: null,
      recentFailures: [],
      stats: { totalCalls: 0, failedCalls: 0, cacheHits: 0 }
    };

    const cacheInfo = (safeClient as any).getCacheInfo?.() || {
      expiration: null,
      size: 0
    };

    let status: 'healthy' | 'degraded' | 'error' = 'healthy';
    if (telemetry.recentFailures.length > 5) {
      status = 'error';
    } else if (telemetry.recentFailures.length > 0) {
      status = 'degraded';
    }

    return {
      status,
      lastValidation: telemetry.lastValidation,
      cacheExpiration: cacheInfo.expiration,
      recentFailures: telemetry.recentFailures,
      stats: telemetry.stats
    };
  },

  /**
   * Força a revalidação de todos os recursos do Gmail no cache
   */
  async forceRevalidation(): Promise<void> {
    if ((safeClient as any).clearCache) {
      (safeClient as any).clearCache('gmail_');
      (safeClient as any).clearCache('rpc_gmail_');
    }
    
    // Opcional: pré-aquecer o cache com recursos críticos
    const resources = ['gmail_accounts', 'gmail_threads', 'rpc_gmail_token_status'];
    for (const res of resources) {
      await safeClient.validateResource(res, res.startsWith('rpc_') ? 'function' : 'table');
    }
  }
};
