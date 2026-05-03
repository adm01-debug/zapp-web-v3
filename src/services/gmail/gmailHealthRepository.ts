
import { safeClient } from '@/integrations/supabase/safeClient';
import { GmailHealthInfo, GmailFailure, GmailHealthFilters } from './types';

export class GmailHealthRepository {
  async getRemoteSummary() {
    try {
      const { data, error } = await safeClient.rpc('rpc_get_gmail_health_summary');
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[GmailHealthRepository] Error fetching summary:', err);
      return null;
    }
  }

  getLocalTelemetry() {
    return (safeClient as any).getTelemetry?.() || {
      lastValidation: null,
      recentFailures: [],
      stats: { totalCalls: 0, failedCalls: 0, cacheHits: 0 }
    };
  }

  getLocalCacheInfo() {
    return (safeClient as any).getCacheInfo?.() || {
      expiration: null,
      size: 0
    };
  }

  async forceRevalidation(resources: string[]) {
    if ((safeClient as any).clearCache) {
      (safeClient as any).clearCache('gmail_');
      (safeClient as any).clearCache('rpc_gmail_');
    }
    
    for (const res of resources) {
      await safeClient.validateResource(res, res.startsWith('rpc_') ? 'function' : 'table');
    }
  }
}
