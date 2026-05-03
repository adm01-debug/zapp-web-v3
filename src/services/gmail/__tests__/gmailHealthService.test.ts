import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GmailHealthService } from '../gmailHealthService';
import { GmailHealthRepository } from '../gmailHealthRepository';
import { GmailFailure } from '../types';

describe('GmailHealthService', () => {
  let service: GmailHealthService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      getRemoteSummary: vi.fn(),
      getLocalTelemetry: vi.fn(),
      getLocalCacheInfo: vi.fn(),
      forceRevalidation: vi.fn(),
    };
    service = new GmailHealthService(mockRepository as any);
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when summary exists and is healthy', async () => {
      mockRepository.getRemoteSummary.mockResolvedValue({ status: 'healthy', last_validation: '2024-01-01T10:00:00Z' });
      mockRepository.getLocalTelemetry.mockReturnValue({
        lastValidation: new Date('2024-01-01T09:00:00Z'),
        recentFailures: [],
        stats: { totalCalls: 10, failedCalls: 0, cacheHits: 5 }
      });
      mockRepository.getLocalCacheInfo.mockReturnValue({ expiration: new Date('2024-01-01T11:00:00Z') });

      const health = await service.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.lastValidation).toEqual(new Date('2024-01-01T10:00:00Z'));
    });

    it('should fallback to local telemetry calculation if summary is missing', async () => {
      mockRepository.getRemoteSummary.mockResolvedValue(null);
      mockRepository.getLocalTelemetry.mockReturnValue({
        lastValidation: new Date('2024-01-01T09:00:00Z'),
        recentFailures: Array(5).fill({}),
        stats: { totalCalls: 10, failedCalls: 5, cacheHits: 5 }
      });
      mockRepository.getLocalCacheInfo.mockReturnValue({ expiration: null });

      const health = await service.getHealthStatus();

      expect(health.status).toBe('degraded');
      expect(health.recentFailures.length).toBe(5);
    });

    it('should return error status if failures exceed threshold', async () => {
      mockRepository.getRemoteSummary.mockResolvedValue(null);
      mockRepository.getLocalTelemetry.mockReturnValue({
        lastValidation: new Date(),
        recentFailures: Array(11).fill({}),
        stats: { totalCalls: 20, failedCalls: 11, cacheHits: 5 }
      });
      mockRepository.getLocalCacheInfo.mockReturnValue({ expiration: null });

      const health = await service.getHealthStatus();
      expect(health.status).toBe('error');
    });
  });

  describe('getFailures with filtering and pagination', () => {
    const mockFailures: GmailFailure[] = [
      { requestId: 'req-1', operation: 'LIST', resource: 'threads', timestamp: new Date(), message: 'Error 1' },
      { requestId: 'req-2', operation: 'GET', resource: 'messages', timestamp: new Date(), message: 'Error 2' },
      { requestId: 'test-req', operation: 'SEND', resource: 'gmail', timestamp: new Date(), message: 'Error 3' },
    ];

    beforeEach(() => {
      mockRepository.getLocalTelemetry.mockReturnValue({
        recentFailures: mockFailures,
        stats: { totalCalls: 100, failedCalls: 3, cacheHits: 50 }
      });
    });

    it('should filter by requestId', () => {
      const result = service.getFailures({ requestId: 'test' });
      expect(result.items.length).toBe(1);
      expect(result.items[0].requestId).toBe('test-req');
      expect(result.total).toBe(1);
    });

    it('should filter by operation (case-insensitive)', () => {
      const result = service.getFailures({ operation: 'list' });
      expect(result.items.length).toBe(1);
      expect(result.items[0].operation).toBe('LIST');
    });

    it('should handle pagination', () => {
      const result = service.getFailures({ page: 2, pageSize: 1 });
      expect(result.items.length).toBe(1);
      expect(result.items[0].requestId).toBe('req-2');
      expect(result.total).toBe(3);
    });
  });
});
