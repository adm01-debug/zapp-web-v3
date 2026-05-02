import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeClient } from '../safeClient';

const mockSelect = vi.fn();
const mockRpcChain = vi.fn();

vi.mock('../client', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: mockSelect,
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn((name: string, params: any) => ({
      limit: vi.fn().mockImplementation(() => {
        return mockRpcChain();
      }),
      then: (resolve: any) => resolve(mockRpcChain())
    })),
  },
}));

describe('safeClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    (safeClient as any).clearCache?.();
  });

  it('deve validar e falhar se uma tabela gmail_* não existir', async () => {
    mockSelect.mockResolvedValue({ error: { message: 'relation "gmail_test" does not exist' } });

    const { data, error } = await safeClient.from('gmail_test_fail', (q) => q.select('*'));

    expect(data).toEqual([]);
    expect(error?.message).toContain('não disponível');
  });

  it('deve mascarar emails e segredos nos logs', async () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const sensitiveData = {
      email: 'test@example.com',
      api_key: 'sk-1234567890abcdef',
      nested: {
        token: 'super-secret-token'
      }
    };

    safeClient.log('req-123', 'info', 'Test log', sensitiveData);

    const loggedDetail = consoleSpy.mock.calls[0][2];
    expect(loggedDetail.email).toBe('te***@example.com');
    expect(loggedDetail.api_key).toBe('***MASKED***');
    expect(loggedDetail.nested.token).toBe('***MASKED***');
  });

  it('deve mascarar tokens em strings longas nos logs', async () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const longToken = 'eyJhY2Nlc3NfdG9rZW4iOiAiMTIzNDU2Nzg5MCJ9.abcdef.12345';
    
    safeClient.log('req-456', 'info', 'Logging token', longToken);
    
    const loggedDetail = consoleSpy.mock.calls[0][2];
    expect(loggedDetail).toMatch(/^eyJhY\.\.\.12345$/);
  });

  it('deve coletar telemetria de falhas', async () => {
    mockSelect.mockResolvedValue({ error: { message: 'relation "gmail_test" does not exist' } });
    
    await safeClient.from('gmail_test_telemetry', (q) => q.select('*'));
    
    const telemetry = (safeClient as any).getTelemetry();
    expect(telemetry.recentFailures.length).toBeGreaterThan(0);
    expect(telemetry.recentFailures[0].resource).toBe('gmail_test_telemetry');
    expect(telemetry.recentFailures[0].error).toContain('não encontrada');
  });

  it('deve usar cache para evitar múltiplas validações', async () => {
    mockSelect.mockResolvedValue({ error: null });
    
    // Primeira chamada: valida
    await safeClient.from('gmail_cache_test', (q) => q.select('*'));
    expect(mockSelect).toHaveBeenCalledTimes(2); // 1 select normal + 1 count head para validar
    
    // Segunda chamada: usa cache
    await safeClient.from('gmail_cache_test', (q) => q.select('*'));
    expect(mockSelect).toHaveBeenCalledTimes(3); // +1 select normal apenas
    
    const telemetry = (safeClient as any).getTelemetry();
    expect(telemetry.stats.cacheHits).toBe(1);
  });
});