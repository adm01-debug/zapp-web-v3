
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
