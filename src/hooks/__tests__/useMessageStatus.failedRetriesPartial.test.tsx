/**
 * Fixtures de `failed_retries` com tentativa parcial (attempt < totalRetries).
 *
 * Contrato testado:
 *  - Enquanto o bus em memória tem o estado de retries (`attempt`, `totalRetries`),
 *    `getMessageStatusDetail` o preserva no payload exposto à UI.
 *  - Após um "reload" (bus limpo, dados vêm só do DB), o status terminal
 *    `failed_retries` e os campos error_* são preservados, mas attempt/totalRetries
 *    voltam a `undefined` — porque essa informação é transient-only por design
 *    (não existe coluna correspondente no DB).
 *  - O hook NÃO inventa valores: nunca infere `attempt = totalRetries`.
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
import {
  emitSendStatus,
  __resetSendStatusForTest,
  type SendStatusDetail,
} from '@/hooks/realtime/sendStatusBus';

// ---------- Fixtures ----------

interface DbRow {
  id: string;
  status: string;
  status_updated_at: string;
  error_code: string | null;
  error_reason: string | null;
}

/** Mensagem que terminou em failed_retries com tentativa parcial (3/5). */
const PARTIAL_FAILED_RETRIES_DB: DbRow = {
  id: 'msg-partial-3of5',
  status: 'failed_retries',
  status_updated_at: '2024-06-01T12:00:00Z',
  error_code: 'NETWORK_TIMEOUT',
  error_reason: 'Upstream did not respond after 30s',
};

/** Mensagem que esgotou todas as tentativas (5/5). */
const EXHAUSTED_FAILED_RETRIES_DB: DbRow = {
  id: 'msg-exhausted-5of5',
  status: 'failed_retries',
  status_updated_at: '2024-06-01T12:01:00Z',
  error_code: 'RETRIES_EXHAUSTED',
  error_reason: 'Max 5 attempts reached',
};

/** Mensagem ainda em retry ativo (2/5) — não terminal, status = retrying. */
const ACTIVE_RETRY_DB: DbRow = {
  id: 'msg-active-2of5',
  status: 'retrying',
  status_updated_at: '2024-06-01T12:02:00Z',
  error_code: null,
  error_reason: null,
};

/**
 * Bus payload helpers — emitidos durante o ciclo de vida do envio.
 * Nota: o bus aceita `Omit<SendStatusDetail, 'updatedAt'>`.
 */
function busPayload(
  status: SendStatusDetail['status'],
  attempt: number,
  totalRetries: number,
  errorCode?: string,
  errorReason?: string,
): Omit<SendStatusDetail, 'updatedAt'> {
  return { status, attempt, totalRetries, errorCode, errorReason };
}

function mockDbReturning(rows: DbRow[]) {
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

// ---------- Tests ----------

describe('failed_retries — attempt/totalRetries preservation across reload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetSendStatusForTest();
  });

  afterEach(() => {
    __resetSendStatusForTest();
  });

  describe('with bus alive (in-memory state)', () => {
    it('preserves partial attempt (3/5) for failed_retries when bus has it', async () => {
      mockDbReturning([PARTIAL_FAILED_RETRIES_DB]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Simulate the send pipeline emitting the terminal failed_retries with
      // a partial attempt count BEFORE the user reloads.
      act(() => {
        emitSendStatus(
          'msg-partial-3of5',
          busPayload('failed_retries', 3, 5, 'NETWORK_TIMEOUT', 'Upstream did not respond after 30s'),
        );
      });

      const detail = result.current.getMessageStatusDetail('msg-partial-3of5');
      expect(detail).toMatchObject({
        status: 'failed_retries',
        attempt: 3,
        totalRetries: 5,
        errorCode: 'NETWORK_TIMEOUT',
        errorReason: 'Upstream did not respond after 30s',
      });
      // Sanidade: attempt < totalRetries (parcial, não esgotado)
      expect(detail!.attempt!).toBeLessThan(detail!.totalRetries!);
    });

    it('preserves exhausted attempt (5/5) for failed_retries when bus has it', async () => {
      mockDbReturning([EXHAUSTED_FAILED_RETRIES_DB]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        emitSendStatus(
          'msg-exhausted-5of5',
          busPayload('failed_retries', 5, 5, 'RETRIES_EXHAUSTED', 'Max 5 attempts reached'),
        );
      });

      const detail = result.current.getMessageStatusDetail('msg-exhausted-5of5');
      expect(detail).toMatchObject({
        status: 'failed_retries',
        attempt: 5,
        totalRetries: 5,
      });
      expect(detail!.attempt).toBe(detail!.totalRetries);
    });

    it('preserves attempt counter for an in-flight retrying message (2/5)', async () => {
      // Caso transient: bus.status = 'retrying' (não terminal).
      // O bus deve ter precedência absoluta sobre o DB (TRANSIENT path).
      mockDbReturning([ACTIVE_RETRY_DB]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        emitSendStatus('msg-active-2of5', busPayload('retrying', 2, 5));
      });

      const detail = result.current.getMessageStatusDetail('msg-active-2of5');
      expect(detail?.status).toBe('retrying');
      expect(detail?.attempt).toBe(2);
      expect(detail?.totalRetries).toBe(5);
      // Sem erro ainda — só telemetria de tentativa
      expect(detail?.errorCode).toBeUndefined();
      expect(detail?.errorReason).toBeUndefined();
    });

    it('handles multiple failed_retries fixtures simultaneously without cross-contamination', async () => {
      mockDbReturning([PARTIAL_FAILED_RETRIES_DB, EXHAUSTED_FAILED_RETRIES_DB]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        emitSendStatus(
          'msg-partial-3of5',
          busPayload('failed_retries', 3, 5, 'NETWORK_TIMEOUT', 'Upstream did not respond after 30s'),
        );
        emitSendStatus(
          'msg-exhausted-5of5',
          busPayload('failed_retries', 5, 5, 'RETRIES_EXHAUSTED', 'Max 5 attempts reached'),
        );
      });

      const partial = result.current.getMessageStatusDetail('msg-partial-3of5');
      const exhausted = result.current.getMessageStatusDetail('msg-exhausted-5of5');

      expect(partial?.attempt).toBe(3);
      expect(exhausted?.attempt).toBe(5);
      // Não deve haver vazamento entre payloads
      expect(partial?.errorCode).toBe('NETWORK_TIMEOUT');
      expect(exhausted?.errorCode).toBe('RETRIES_EXHAUSTED');
    });
  });

  describe('after reload (bus cleared, DB only)', () => {
    it('preserves status + error_* for failed_retries but loses attempt/totalRetries (DB has no such columns)', async () => {
      mockDbReturning([PARTIAL_FAILED_RETRIES_DB]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Simula "reload": o bus está vazio (foi reset no beforeEach,
      // nada foi emitido depois do mount).
      const detail = result.current.getMessageStatusDetail('msg-partial-3of5');

      expect(detail).toBeDefined();
      // Persistido: status terminal + códigos de erro (DB)
      expect(detail?.status).toBe('failed_retries');
      expect(detail?.errorCode).toBe('NETWORK_TIMEOUT');
      expect(detail?.errorReason).toBe('Upstream did not respond after 30s');
      // Não persistido: attempt/totalRetries são transient-only
      expect(detail?.attempt).toBeUndefined();
      expect(detail?.totalRetries).toBeUndefined();
    });

    it('does not invent attempt = totalRetries for failed_retries fetched from DB', async () => {
      // Regressão: garantir que ninguém "inferiu" attempt = totalRetries
      // só porque o status final é failed_retries.
      mockDbReturning([EXHAUSTED_FAILED_RETRIES_DB]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const detail = result.current.getMessageStatusDetail('msg-exhausted-5of5');
      expect(detail?.status).toBe('failed_retries');
      expect(detail?.attempt).toBeUndefined();
      expect(detail?.totalRetries).toBeUndefined();
    });

    it('full lifecycle: bus emits partial → reload clears bus → only DB fields remain', async () => {
      mockDbReturning([PARTIAL_FAILED_RETRIES_DB]);
      const { result, unmount } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Step 1: bus alive — emite estado parcial
      act(() => {
        emitSendStatus(
          'msg-partial-3of5',
          busPayload('failed_retries', 3, 5, 'NETWORK_TIMEOUT', 'Upstream did not respond after 30s'),
        );
      });
      const beforeReload = result.current.getMessageStatusDetail('msg-partial-3of5');
      expect(beforeReload?.attempt).toBe(3);
      expect(beforeReload?.totalRetries).toBe(5);

      // Step 2: simula reload — desmonta hook, limpa bus, monta de novo
      unmount();
      __resetSendStatusForTest();
      mockDbReturning([PARTIAL_FAILED_RETRIES_DB]);
      const { result: result2 } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result2.current.isLoading).toBe(false));

      const afterReload = result2.current.getMessageStatusDetail('msg-partial-3of5');
      // Status + error_* sobrevivem
      expect(afterReload?.status).toBe('failed_retries');
      expect(afterReload?.errorCode).toBe('NETWORK_TIMEOUT');
      expect(afterReload?.errorReason).toBe('Upstream did not respond after 30s');
      // attempt/totalRetries somem (não persistidos no DB)
      expect(afterReload?.attempt).toBeUndefined();
      expect(afterReload?.totalRetries).toBeUndefined();
    });

    it('post-reload re-emit on the bus restores attempt/totalRetries (e.g. user clicks "reenviar")', async () => {
      // Cenário realista: depois do reload, o usuário clica "reenviar" e o
      // pipeline re-emite o status. A UI deve voltar a ver o counter.
      mockDbReturning([PARTIAL_FAILED_RETRIES_DB]);
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Antes da re-emissão: só DB
      const beforeReemit = result.current.getMessageStatusDetail('msg-partial-3of5');
      expect(beforeReemit?.attempt).toBeUndefined();

      // Pipeline re-emite (manual resend tentativa #4 do total 5)
      act(() => {
        emitSendStatus('msg-partial-3of5', busPayload('retrying', 4, 5));
      });

      const afterReemit = result.current.getMessageStatusDetail('msg-partial-3of5');
      expect(afterReemit?.status).toBe('retrying');
      expect(afterReemit?.attempt).toBe(4);
      expect(afterReemit?.totalRetries).toBe(5);
    });
  });
});
