/**
 * Foco: validar que `getMessageStatusDetail` transforma `error_code` /
 * `error_reason` (snake_case do DB) nos campos `errorCode` / `errorReason`
 * (camelCase) que a UI consome — incluindo a normalização null↔undefined,
 * que historicamente já causou bugs em badges de "falha de auth" / "max
 * retries" porque a UI checa `if (detail.errorReason)` (falsy-ish).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

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
import { emitSendStatus, __resetSendStatusForTest } from '@/hooks/realtime/sendStatusBus';

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

describe('getMessageStatusDetail — payload mapping for the UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetSendStatusForTest();
  });

  afterEach(() => {
    __resetSendStatusForTest();
  });

  describe('snake_case → camelCase translation', () => {
    it('renames error_code → errorCode and error_reason → errorReason for failed_auth', async () => {
      mockDbReturning([
        {
          id: 'auth-1',
          status: 'failed_auth',
          status_updated_at: '2024-05-01T10:00:00Z',
          error_code: 'AUTH_401',
          error_reason: 'Token revogado pela Evolution API',
        },
      ]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const detail = result.current.getMessageStatusDetail('auth-1');
      // The UI consumes the camelCase shape exclusively
      expect(detail).toMatchObject({
        status: 'failed_auth',
        errorCode: 'AUTH_401',
        errorReason: 'Token revogado pela Evolution API',
      });
      // snake_case keys must NOT leak into the UI payload
      expect(detail).not.toHaveProperty('error_code');
      expect(detail).not.toHaveProperty('error_reason');
    });

    it('renames error_code → errorCode and error_reason → errorReason for failed_retries', async () => {
      mockDbReturning([
        {
          id: 'ret-1',
          status: 'failed_retries',
          status_updated_at: '2024-05-01T10:00:00Z',
          error_code: 'RETRIES_EXHAUSTED',
          error_reason: 'Tentativas esgotadas após 5 envios',
        },
      ]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const detail = result.current.getMessageStatusDetail('ret-1');
      expect(detail).toMatchObject({
        status: 'failed_retries',
        errorCode: 'RETRIES_EXHAUSTED',
        errorReason: 'Tentativas esgotadas após 5 envios',
      });
      expect(detail).not.toHaveProperty('error_code');
      expect(detail).not.toHaveProperty('error_reason');
    });
  });

  describe('null → undefined normalization (UI consumes via truthy check)', () => {
    it('normalizes DB null error_code/error_reason to undefined for failed_auth without details', async () => {
      // failed_auth pode chegar sem reason quando o webhook só carrega o status
      mockDbReturning([
        {
          id: 'auth-2',
          status: 'failed_auth',
          status_updated_at: '2024-05-01T10:00:00Z',
          error_code: null,
          error_reason: null,
        },
      ]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const detail = result.current.getMessageStatusDetail('auth-2');
      expect(detail?.status).toBe('failed_auth');
      // Crítico: null vira undefined, NUNCA permanece null (a UI faz `if (detail.errorReason)`
      // e renderiza o texto cru — exibir "null" é um bug visível)
      expect(detail?.errorCode).toBeUndefined();
      expect(detail?.errorReason).toBeUndefined();
      expect(detail?.errorCode).not.toBeNull();
      expect(detail?.errorReason).not.toBeNull();
    });

    it('normalizes DB null error_code/error_reason to undefined for failed_retries without details', async () => {
      mockDbReturning([
        {
          id: 'ret-2',
          status: 'failed_retries',
          status_updated_at: '2024-05-01T10:00:00Z',
          error_code: null,
          error_reason: null,
        },
      ]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const detail = result.current.getMessageStatusDetail('ret-2');
      expect(detail?.status).toBe('failed_retries');
      expect(detail?.errorCode).toBeUndefined();
      expect(detail?.errorReason).toBeUndefined();
      expect(detail?.errorCode).not.toBeNull();
      expect(detail?.errorReason).not.toBeNull();
    });

    it('normalizes when the row is missing error_code/error_reason keys entirely', async () => {
      // Cenário real: SELECTs antigos sem as colunas, ou linhas legadas
      mockDbReturning([
        {
          id: 'legacy-1',
          status: 'failed_auth',
          status_updated_at: '2024-05-01T10:00:00Z',
          // sem error_code nem error_reason
        },
      ]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const detail = result.current.getMessageStatusDetail('legacy-1');
      expect(detail?.errorCode).toBeUndefined();
      expect(detail?.errorReason).toBeUndefined();
    });

    it('treats empty string as a present value (does NOT coerce "" to undefined)', async () => {
      // Documentar o contrato: só null/undefined viram undefined.
      // String vazia é responsabilidade do produtor (DB) — passa direto.
      mockDbReturning([
        {
          id: 'empty-1',
          status: 'failed_auth',
          status_updated_at: '2024-05-01T10:00:00Z',
          error_code: '',
          error_reason: '',
        },
      ]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const detail = result.current.getMessageStatusDetail('empty-1');
      // `?? undefined` só substitui null/undefined; '' permanece ''
      expect(detail?.errorCode).toBe('');
      expect(detail?.errorReason).toBe('');
    });
  });

  describe('bus vs DB precedence on errorCode/errorReason', () => {
    it('bus errorReason wins over DB when bus is fresher (failed_auth)', async () => {
      mockDbReturning([
        {
          id: 'mix-1',
          status: 'failed_auth',
          status_updated_at: '2024-05-01T10:00:00Z',
          error_code: 'STALE',
          error_reason: 'mensagem antiga do DB',
        },
      ]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Bus emite DEPOIS (Date.now() > 2024-05-01)
      act(() => {
        emitSendStatus('mix-1', {
          status: 'failed_auth',
          attempt: 3,
          totalRetries: 5,
          errorCode: 'AUTH_401',
          errorReason: 'Token revogado agora',
        });
      });

      const detail = result.current.getMessageStatusDetail('mix-1');
      expect(detail?.status).toBe('failed_auth');
      expect(detail?.errorCode).toBe('AUTH_401');
      expect(detail?.errorReason).toBe('Token revogado agora');
      // attempt/totalRetries só vêm do bus
      expect(detail?.attempt).toBe(3);
      expect(detail?.totalRetries).toBe(5);
    });

    it('falls back to DB errorReason when bus omits it (failed_retries)', async () => {
      // O bus pode emitir `failed_retries` sem errorReason (apenas o status final).
      // Nesse caso, o detail deve preencher o errorReason a partir do DB.
      mockDbReturning([
        {
          id: 'mix-2',
          status: 'failed_retries',
          status_updated_at: '2024-05-01T10:00:00Z',
          error_code: 'RETRIES_EXHAUSTED',
          error_reason: 'Max 5 attempts reached',
        },
      ]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        emitSendStatus('mix-2', {
          status: 'failed_retries',
          attempt: 5,
          totalRetries: 5,
          // sem errorCode/errorReason no bus
        });
      });

      const detail = result.current.getMessageStatusDetail('mix-2');
      expect(detail?.errorCode).toBe('RETRIES_EXHAUSTED');
      expect(detail?.errorReason).toBe('Max 5 attempts reached');
      expect(detail?.attempt).toBe(5);
      expect(detail?.totalRetries).toBe(5);
    });

    it('returns undefined for both errorCode and errorReason when bus and DB lack them', async () => {
      mockDbReturning([
        {
          id: 'mix-3',
          status: 'failed_retries',
          status_updated_at: '2024-05-01T10:00:00Z',
          error_code: null,
          error_reason: null,
        },
      ]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        emitSendStatus('mix-3', { status: 'failed_retries', attempt: 5, totalRetries: 5 });
      });

      const detail = result.current.getMessageStatusDetail('mix-3');
      expect(detail?.errorCode).toBeUndefined();
      expect(detail?.errorReason).toBeUndefined();
    });
  });
});
