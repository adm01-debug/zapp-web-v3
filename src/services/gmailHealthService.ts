
import { safeClient } from '@/integrations/supabase/safeClient';

export interface GmailFailure {
  requestId: string;
  operation: string;
  resource: string;
  error: string;
  timestamp: string;
}

export interface GmailHealthInfo {
  status: 'healthy' | 'degraded' | 'error';
  lastValidation: Date | null;
  cacheExpiration: number | null;
  recentFailures: GmailFailure[];
  stats: {
    totalCalls: number;
    failedCalls: number;
    cacheHits: number;
  };
}

export interface GmailHealthFilters {
  requestId?: string;
  operation?: string;
  resource?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Serviço que agrega informações de saúde e telemetria do Gmail via safeClient
 */
export const gmailHealthService = {
  /**
   * Retorna o estado consolidado da saúde do Gmail
   */
  async getHealthStatus(): Promise<GmailHealthInfo> {
    // Tentar buscar sumário do banco primeiro
    try {
      const { data: summary, error } = await safeClient.rpc('rpc_get_gmail_health_summary');
      if (!error && summary) {
        const telemetry = (safeClient as any).getTelemetry?.() || {
          lastValidation: null,
          recentFailures: [],
          stats: { totalCalls: 0, failedCalls: 0, cacheHits: 0 }
        };

        const cacheInfo = (safeClient as any).getCacheInfo?.() || {
          expiration: null,
          size: 0
        };

        return {
          status: summary.status as any,
          lastValidation: summary.last_validation ? new Date(summary.last_validation) : telemetry.lastValidation,
          cacheExpiration: cacheInfo.expiration,
          recentFailures: telemetry.recentFailures,
          stats: telemetry.stats
        };
      }
    } catch (err) {
      console.warn('[gmailHealthService] Erro ao buscar sumário do banco, usando fallback local', err);
    }

    // Fallback para métricas locais do safeClient
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
    
    // Thresholds: > 10 failures in last 50 calls
    const recentFailureCount = telemetry.recentFailures.length;
    if (recentFailureCount > 10) {
      status = 'error';
    } else if (recentFailureCount > 0) {
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
   * Retorna falhas filtradas e paginadas
   */
  getFailures(filters: GmailHealthFilters = {}): { items: GmailFailure[], total: number } {
    const telemetry = (safeClient as any).getTelemetry?.() || { recentFailures: [] };
    let failures: GmailFailure[] = telemetry.recentFailures;

    if (filters.requestId) {
      failures = failures.filter(f => f.requestId.includes(filters.requestId!));
    }
    if (filters.operation) {
      failures = failures.filter(f => f.operation.toLowerCase() === filters.operation!.toLowerCase());
    }
    if (filters.resource) {
      failures = failures.filter(f => f.resource.toLowerCase().includes(filters.resource!.toLowerCase()));
    }

    const total = failures.length;
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 10;
    const items = failures.slice((page - 1) * pageSize, page * pageSize);

    return { items, total };
  },

  /**
   * Força a revalidação de todos os recursos do Gmail no cache
   */
  async forceRevalidation(): Promise<void> {
    if ((safeClient as any).clearCache) {
      (safeClient as any).clearCache('gmail_');
      (safeClient as any).clearCache('rpc_gmail_');
    }
    
    // Pré-aquecer o cache com recursos críticos
    const resources = ['gmail_accounts', 'gmail_threads', 'rpc_gmail_token_status'];
    for (const res of resources) {
      await safeClient.validateResource(res, res.startsWith('rpc_') ? 'function' : 'table');
    }
  }
};
