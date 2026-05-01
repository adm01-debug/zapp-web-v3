/**
 * Robustez de `getMessageStatusDetail` contra fixtures degeneradas:
 *  - Campos error_code/error_reason ausentes
 *  - Tipos incorretos vindos do DB (number, boolean, objeto, array, NaN)
 *  - Linhas malformadas misturadas a linhas válidas
 *
 * Contrato:
 *  1. Nunca lançar exceção (UI não pode quebrar por dado podre).
 *  2. Sempre devolver um detail com `status` definido para failed_auth/failed_retries.
 *  3. errorCode aceita string|number (per typing), mas tipos exóticos não devem
 *     aparecer como [object Object] / "true" no badge — devem virar undefined
 *     ou pelo menos não quebrar o consumidor que faz `String(errorCode)`.
 *  4. Outras mensagens válidas no mesmo fetch continuam funcionando.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockFrom = vi.fn();
const mockChannel = vi.fn().mockReturnValue({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
});
const mockRemoveChannel = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { useMessageStatus } from '@/features/inbox';
import { __resetSendStatusForTest } from '@/hooks/realtime/sendStatusBus';

function mockDbReturning(rows: Array<Record<string, unknown>>) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          not: vi.fn().mockResolvedValue({ data: rows, error: null }),
        }),
      }),
    }),
  });
}

describe('getMessageStatusDetail — robustness against malformed fixtures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetSendStatusForTest();
  });
  afterEach(() => {
    __resetSendStatusForTest();
  });

  describe('missing error fields', () => {
    it('failed_auth without error_code/error_reason keys → coherent state, no throw', async () => {
      mockDbReturning([
        {
          id: 'auth-missing',
          status: 'failed_auth',
          status_updated_at: '2024-07-01T10:00:00Z',
          // chaves omitidas inteiramente
        },
      ]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let detail: ReturnType<typeof result.current.getMessageStatusDetail>;
      expect(() => {
        detail = result.current.getMessageStatusDetail('auth-missing');
      }).not.toThrow();

      expect(detail).toBeDefined();
      expect(detail!.status).toBe('failed_auth');
      expect(detail!.errorCode).toBeUndefined();
      expect(detail!.errorReason).toBeUndefined();
    });

    it('failed_retries without error_code/error_reason keys → coherent state, no throw', async () => {
      mockDbReturning([
        {
          id: 'ret-missing',
          status: 'failed_retries',
          status_updated_at: '2024-07-01T10:01:00Z',
        },
      ]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const detail = result.current.getMessageStatusDetail('ret-missing');
      expect(detail).toBeDefined();
      expect(detail!.status).toBe('failed_retries');
      expect(detail!.errorCode).toBeUndefined();
      expect(detail!.errorReason).toBeUndefined();
    });

    it('failed_auth with status_updated_at missing → still returns detail (status drives the verdict)', async () => {
      mockDbReturning([
        {
          id: 'auth-no-ts',
          status: 'failed_auth',
          // sem status_updated_at — hook deve cair no fallback `new Date().toISOString()`
        },
      ]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const detail = result.current.getMessageStatusDetail('auth-no-ts');
      expect(detail).toBeDefined();
      expect(detail!.status).toBe('failed_auth');
    });
  });

  describe('wrong-typed error_code / error_reason', () => {
    it('numeric error_code is accepted (typing allows string | number)', async () => {
      // O type MessageStatusDetail aceita errorCode: string | number,
      // então 401 numérico deve passar sem coerção.
      mockDbReturning([
        {
          id: 'auth-numeric',
          status: 'failed_auth',
          status_updated_at: '2024-07-01T10:02:00Z',
          error_code: 401,
          error_reason: 'Unauthorized',
        },
      ]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const detail = result.current.getMessageStatusDetail('auth-numeric');
      expect(detail!.status).toBe('failed_auth');
      expect(detail!.errorCode).toBe(401);
      expect(detail!.errorReason).toBe('Unauthorized');
      // String(errorCode) deve produzir algo legível, nunca "[object Object]"
      expect(String(detail!.errorCode)).toBe('401');
    });

    it('boolean error_code/error_reason → does not throw, status remains coherent', async () => {
      mockDbReturning([
        {
          id: 'auth-bool',
          status: 'failed_auth',
          status_updated_at: '2024-07-01T10:03:00Z',
          error_code: true as unknown as string,
          error_reason: false as unknown as string,
        },
      ]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let detail: ReturnType<typeof result.current.getMessageStatusDetail>;
      expect(() => {
        detail = result.current.getMessageStatusDetail('auth-bool');
      }).not.toThrow();

      expect(detail!.status).toBe('failed_auth');
      // Não inventamos coerção: o hook devolve o que veio. O importante é
      // não quebrar e o status terminal continuar correto.
      // String(true) === 'true' é benigno; o que NÃO pode é throw / [object Object].
      const codeStr = detail!.errorCode === undefined ? '' : String(detail!.errorCode);
      const reasonStr = detail!.errorReason === undefined ? '' : String(detail!.errorReason);
      expect(codeStr).not.toMatch(/\[object/);
      expect(reasonStr).not.toMatch(/\[object/);
    });

    it('object error_reason → does not throw and status stays correct for failed_retries', async () => {
      mockDbReturning([
        {
          id: 'ret-object',
          status: 'failed_retries',
          status_updated_at: '2024-07-01T10:04:00Z',
          error_code: { code: 'NESTED' } as unknown as string,
          error_reason: { msg: 'should be string' } as unknown as string,
        },
      ]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let detail: ReturnType<typeof result.current.getMessageStatusDetail>;
      expect(() => {
        detail = result.current.getMessageStatusDetail('ret-object');
      }).not.toThrow();

      expect(detail).toBeDefined();
      expect(detail!.status).toBe('failed_retries');
    });

    it('array error_reason → does not throw, status stays correct', async () => {
      mockDbReturning([
        {
          id: 'auth-array',
          status: 'failed_auth',
          status_updated_at: '2024-07-01T10:05:00Z',
          error_code: ['A', 'B'] as unknown as string,
          error_reason: ['x'] as unknown as string,
        },
      ]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let detail: ReturnType<typeof result.current.getMessageStatusDetail>;
      expect(() => {
        detail = result.current.getMessageStatusDetail('auth-array');
      }).not.toThrow();
      expect(detail!.status).toBe('failed_auth');
    });

    it('NaN error_code → does not throw and status stays coherent', async () => {
      mockDbReturning([
        {
          id: 'ret-nan',
          status: 'failed_retries',
          status_updated_at: '2024-07-01T10:06:00Z',
          error_code: NaN as unknown as string,
          error_reason: 'Out of memory',
        },
      ]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const detail = result.current.getMessageStatusDetail('ret-nan');
      expect(detail!.status).toBe('failed_retries');
      expect(detail!.errorReason).toBe('Out of memory');
      // NaN é falsy-ish para `??` (NaN não é null nem undefined), passa adiante.
      // Garantimos só que não houve exceção e que reason válido sobreviveu.
    });
  });

  describe('mixed batches: malformed rows must not poison healthy ones', () => {
    it('one bad row + one good row → both yield coherent details', async () => {
      mockDbReturning([
        {
          id: 'good-1',
          status: 'failed_auth',
          status_updated_at: '2024-07-01T11:00:00Z',
          error_code: 'AUTH_401',
          error_reason: 'Token expirado',
        },
        {
          id: 'bad-1',
          status: 'failed_retries',
          status_updated_at: '2024-07-01T11:00:01Z',
          error_code: { weird: true } as unknown as string,
          error_reason: undefined,
        },
      ]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let good: ReturnType<typeof result.current.getMessageStatusDetail>;
      let bad: ReturnType<typeof result.current.getMessageStatusDetail>;
      expect(() => {
        good = result.current.getMessageStatusDetail('good-1');
        bad = result.current.getMessageStatusDetail('bad-1');
      }).not.toThrow();

      // A linha boa NÃO foi contaminada
      expect(good!.status).toBe('failed_auth');
      expect(good!.errorCode).toBe('AUTH_401');
      expect(good!.errorReason).toBe('Token expirado');

      // A linha ruim ainda devolve um status coerente
      expect(bad!.status).toBe('failed_retries');
    });

    it('row with status only (no error fields, no timestamp) is iterable without crash', async () => {
      mockDbReturning([
        { id: 'min-1', status: 'failed_auth' },
        { id: 'min-2', status: 'failed_retries' },
        { id: 'good', status: 'sent', status_updated_at: '2024-07-01T11:30:00Z', error_code: null, error_reason: null },
      ]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(() => {
        result.current.getMessageStatusDetail('min-1');
        result.current.getMessageStatusDetail('min-2');
        result.current.getMessageStatusDetail('good');
      }).not.toThrow();

      expect(result.current.getMessageStatusDetail('min-1')?.status).toBe('failed_auth');
      expect(result.current.getMessageStatusDetail('min-2')?.status).toBe('failed_retries');
      expect(result.current.getMessageStatusDetail('good')?.status).toBe('sent');
    });
  });

  describe('unknown messageId / unset state', () => {
    it('returns undefined (not a throw) for an id that was never seen', async () => {
      mockDbReturning([]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let detail: ReturnType<typeof result.current.getMessageStatusDetail>;
      expect(() => {
        detail = result.current.getMessageStatusDetail('never-seen');
      }).not.toThrow();
      expect(detail).toBeUndefined();
    });
  });
});
