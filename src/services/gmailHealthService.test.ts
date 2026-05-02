import { gmailHealthService } from './gmailHealthService';
import { safeClient } from '@/integrations/supabase/safeClient';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('gmailHealthService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Limpar estado interno do safeClient se necessário ou mockar métodos
    if ((safeClient as any).clearCache) {
      (safeClient as any).clearCache();
    }
  });

  it('deve mascarar emails nos logs do safeClient', () => {
    const spy = vi.spyOn(console, 'info');
    const email = 'usuario.teste@example.com';
    safeClient.log('test-id', 'info', 'Email recebido', { email });
    
    expect(spy).toHaveBeenCalled();
    const callArgs = spy.mock.calls[0];
    const maskedDetail = callArgs[2];
    expect(maskedDetail.email).toContain('***@example.com');
    expect(maskedDetail.email).not.toBe(email);
  });

  it('deve mascarar tokens e segredos', () => {
    const spy = vi.spyOn(console, 'warn');
    const secret = 'super-secret-token-12345';
    safeClient.log('test-id', 'warn', 'Token expirado', { api_key: secret, nested: { token: secret } });
    
    const maskedDetail = spy.mock.calls[0][2];
    expect(maskedDetail.api_key).toBe('***MASKED***');
    expect(maskedDetail.nested.token).toBe('***MASKED***');
  });

  it('deve retornar status "error" quando houver muitas falhas', async () => {
    // Simular falhas
    for (let i = 0; i < 15; i++) {
      (safeClient as any).recordFailure?.(`req-${i}`, 'rpc', 'gmail_test', 'Error message');
    }

    const health = await gmailHealthService.getHealthStatus();
    expect(health.status).toBe('error');
    expect(health.recentFailures.length).toBeGreaterThan(10);
  });

  it('deve filtrar falhas por requestId', () => {
    (safeClient as any).recordFailure?.('target-id', 'rpc', 'gmail_test', 'Error');
    (safeClient as any).recordFailure?.('other-id', 'rpc', 'gmail_test', 'Error');

    const result = gmailHealthService.getFailures({ requestId: 'target' });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].requestId).toBe('target-id');
  });

  it('deve forçar a revalidação e limpar o cache', async () => {
    const clearSpy = vi.spyOn(safeClient as any, 'clearCache');
    await gmailHealthService.forceRevalidation();
    expect(clearSpy).toHaveBeenCalled();
  });
});
