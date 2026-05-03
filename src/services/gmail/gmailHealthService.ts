
import { GmailHealthInfo, GmailHealthFilters, GmailFailure } from './types';
import { GmailHealthRepository } from './gmailHealthRepository';

export class GmailHealthService {
  private repository: GmailHealthRepository;

  constructor(repository: GmailHealthRepository) {
    this.repository = repository;
  }

  async getHealthStatus(): Promise<GmailHealthInfo> {
    const summary = await this.repository.getRemoteSummary();
    const telemetry = this.repository.getLocalTelemetry();
    const cacheInfo = this.repository.getLocalCacheInfo();

    if (summary) {
      return {
        status: summary.status as any,
        lastValidation: summary.last_validation ? new Date(summary.last_validation) : telemetry.lastValidation,
        cacheExpiration: cacheInfo.expiration,
        recentFailures: telemetry.recentFailures,
        stats: telemetry.stats
      };
    }

    return {
      status: this.calculateStatus(telemetry.recentFailures),
      lastValidation: telemetry.lastValidation,
      cacheExpiration: cacheInfo.expiration,
      recentFailures: telemetry.recentFailures,
      stats: telemetry.stats
    };
  }

  getFailures(filters: GmailHealthFilters = {}): { items: GmailFailure[], total: number } {
    const telemetry = this.repository.getLocalTelemetry();
    let failures: GmailFailure[] = Array.isArray(telemetry?.recentFailures) ? telemetry.recentFailures : [];

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
  }

  async forceRevalidation(): Promise<void> {
    const criticalResources = ['gmail_accounts', 'gmail_threads', 'rpc_gmail_token_status'];
    await this.repository.forceRevalidation(criticalResources);
  }

  private calculateStatus(failures: GmailFailure[]): 'healthy' | 'degraded' | 'error' {
    if (!Array.isArray(failures)) return 'error';
    const count = failures.length;
    if (count > 10) return 'error';
    if (count > 0) return 'degraded';
    return 'healthy';
  }
}

// Singleton instance for convenience, matching original export pattern
export const gmailHealthService = new GmailHealthService(new GmailHealthRepository());
