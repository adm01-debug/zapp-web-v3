/**
 * Integração — pipeline DB → useMessageStatus após reload.
 *
 * Garante que os campos `error_code` / `error_reason` chegam ao hook
 * (1) pelo SELECT inicial (`fetchInitialStatuses`)
 * (2) pelo canal realtime de UPDATE
 * SEM perda nem renomeação no caminho — exatamente como o PostgREST
 * (Lovable Cloud) os entrega.
 *
 * Estes mocks reproduzem o contrato do supabase-js: `.from().select().eq().eq().not()`
 * e `.channel().on('postgres_changes', cfg, handler)` capturando o handler para
 * disparar updates em tempo real no teste.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// ---------- Captura do handler de realtime ----------
type RealtimeHandler = (payload: { new: Record<string, unknown>; old?: Record<string, unknown> }) => void;
let capturedHandler: RealtimeHandler | null = null;

const subscribeMock = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });
const onMock = vi.fn().mockImplementation((_event: string, _cfg: unknown, handler: RealtimeHandler) => {
  capturedHandler = handler;
  return { subscribe: subscribeMock };
});
const channelMock = vi.fn().mockReturnValue({ on: onMock });
const removeChannelMock = vi.fn();

const fromMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    channel: (...args: unknown[]) => channelMock(...args),
    removeChannel: (...args: unknown[]) => removeChannelMock(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { useMessageStatus } from '@/hooks/useMessageStatus';
import { __resetSendStatusForTest } from '@/hooks/realtime/sendStatusBus';

/** Helper: monta a chain `.select().eq().eq().not()` exatamente como o hook usa. */
function mockSelectChain(rows: ReadonlyArray<unknown>) {
  fromMock.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          not: vi.fn().mockResolvedValue({ data: rows, error: null }),
        }),
      }),
    }),
  });
}

/** Fixture realista de retorno do PostgREST para uma mensagem failed_*. */
interface MessageRow {
  id: string;
  status: string;
  status_updated_at: string;
  error_code: string | null;
  error_reason: string | null;
}

const FIXTURE_ROWS: MessageRow[] = [
  {
    id: 'wa-msg-001',
    status: 'failed_auth',
    status_updated_at: '2024-08-01T09:00:00.000Z',
    error_code: 'AUTH_401',
    error_reason: 'Invalid Evolution API key',
  },
  {
    id: 'wa-msg-002',
    status: 'failed_retries',
    status_updated_at: '2024-08-01T09:01:00.000Z',
    error_code: 'RETRIES_EXHAUSTED',
    error_reason: 'Max 5 attempts reached after upstream timeouts',
  },
  {
    id: 'wa-msg-003',
    status: 'failed',
    status_updated_at: '2024-08-01T09:02:00.000Z',
    error_code: 'GENERIC',
    error_reason: 'send error',
  },
  {
    id: 'wa-msg-004',
    status: 'sent',
    status_updated_at: '2024-08-01T09:03:00.000Z',
    error_code: null,
    error_reason: null,
  },
];

describe('integration: DB → useMessageStatus after reload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedHandler = null;
    __resetSendStatusForTest();
  });
  afterEach(() => {
    __resetSendStatusForTest();
  });

  describe('initial SELECT (fetchInitialStatuses)', () => {
    it('preserves error_code and error_reason for failed_auth from PostgREST response', async () => {
      mockSelectChain(FIXTURE_ROWS);
      const { result } = renderHook(() => useMessageStatus('contact-X'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // The select() arguments must include the error columns — otherwise
      // PostgREST won't return them and the hook would silently lose data.
      const selectFn = (fromMock.mock.results[0].value as { select: ReturnType<typeof vi.fn> }).select;
      expect(selectFn).toHaveBeenCalledWith(expect.stringContaining('error_code'));
      expect(selectFn).toHaveBeenCalledWith(expect.stringContaining('error_reason'));

      // Map storage preserves snake_case as returned by DB
      const stored = result.current.statusUpdates.get('wa-msg-001');
      expect(stored?.error_code).toBe('AUTH_401');
      expect(stored?.error_reason).toBe('Invalid Evolution API key');

      // Detail exposes camelCase to UI without losing values
      const detail = result.current.getMessageStatusDetail('wa-msg-001');
      expect(detail?.status).toBe('failed_auth');
      expect(detail?.errorCode).toBe('AUTH_401');
      expect(detail?.errorReason).toBe('Invalid Evolution API key');
    });

    it('preserves error_code and error_reason for failed_retries from PostgREST response', async () => {
      mockSelectChain(FIXTURE_ROWS);
      const { result } = renderHook(() => useMessageStatus('contact-X'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const stored = result.current.statusUpdates.get('wa-msg-002');
      expect(stored?.error_code).toBe('RETRIES_EXHAUSTED');
      expect(stored?.error_reason).toBe('Max 5 attempts reached after upstream timeouts');

      const detail = result.current.getMessageStatusDetail('wa-msg-002');
      expect(detail?.status).toBe('failed_retries');
      expect(detail?.errorCode).toBe('RETRIES_EXHAUSTED');
      expect(detail?.errorReason).toBe('Max 5 attempts reached after upstream timeouts');
    });

    it('roundtrips ALL rows of a multi-message fixture without dropping or swapping fields', async () => {
      mockSelectChain(FIXTURE_ROWS);
      const { result } = renderHook(() => useMessageStatus('contact-X'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // 4 rows in fixture, 4 rows in map (none lost)
      expect(result.current.statusUpdates.size).toBe(4);

      // Cross-check each id resolves to the right (status, errorCode, errorReason)
      for (const row of FIXTURE_ROWS) {
        const detail = result.current.getMessageStatusDetail(row.id);
        expect(detail?.status).toBe(row.status);
        expect(detail?.errorCode).toBe(row.error_code ?? undefined);
        expect(detail?.errorReason).toBe(row.error_reason ?? undefined);
      }
    });
  });

  describe('realtime UPDATE channel', () => {
    it('passes error_code/error_reason from realtime payload into the hook state', async () => {
      mockSelectChain([]);
      const { result } = renderHook(() => useMessageStatus('contact-X'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // O hook deve ter assinado o canal e capturado o handler
      expect(capturedHandler).toBeTruthy();

      // Simular um UPDATE que chega via realtime — payload no formato PostgREST:
      // { new: { ...row }, old: {...} }
      act(() => {
        capturedHandler!({
          new: {
            id: 'wa-msg-realtime-1',
            status: 'failed_auth',
            status_updated_at: '2024-08-01T10:00:00.000Z',
            error_code: 'AUTH_401',
            error_reason: 'Token revogado pela Evolution',
          },
        });
      });

      const detail = result.current.getMessageStatusDetail('wa-msg-realtime-1');
      expect(detail?.status).toBe('failed_auth');
      expect(detail?.errorCode).toBe('AUTH_401');
      expect(detail?.errorReason).toBe('Token revogado pela Evolution');
    });

    it('updates an existing message via realtime preserving the new error fields', async () => {
      mockSelectChain([FIXTURE_ROWS[0]]); // começa com failed_auth/AUTH_401
      const { result } = renderHook(() => useMessageStatus('contact-X'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Realtime upgrade: passa para failed_retries com novo código/razão
      act(() => {
        capturedHandler!({
          new: {
            id: 'wa-msg-001',
            status: 'failed_retries',
            status_updated_at: '2024-08-01T10:30:00.000Z',
            error_code: 'RETRIES_EXHAUSTED',
            error_reason: 'Tentativas esgotadas',
          },
        });
      });

      const detail = result.current.getMessageStatusDetail('wa-msg-001');
      expect(detail?.status).toBe('failed_retries');
      expect(detail?.errorCode).toBe('RETRIES_EXHAUSTED');
      expect(detail?.errorReason).toBe('Tentativas esgotadas');
    });

    it('realtime payload with null error fields normalizes to undefined in the detail', async () => {
      mockSelectChain([]);
      const { result } = renderHook(() => useMessageStatus('contact-X'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        capturedHandler!({
          new: {
            id: 'wa-msg-null',
            status: 'failed_retries',
            status_updated_at: '2024-08-01T11:00:00.000Z',
            error_code: null,
            error_reason: null,
          },
        });
      });

      const detail = result.current.getMessageStatusDetail('wa-msg-null');
      expect(detail?.status).toBe('failed_retries');
      expect(detail?.errorCode).toBeUndefined();
      expect(detail?.errorReason).toBeUndefined();
    });
  });

  describe('reload simulation (full unmount + remount)', () => {
    it('after unmount/remount, error_code and error_reason are re-fetched and re-exposed identically', async () => {
      // Mount #1 — bus fica vazio (pós-reset)
      mockSelectChain(FIXTURE_ROWS);
      const { result, unmount } = renderHook(() => useMessageStatus('contact-X'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const before = result.current.getMessageStatusDetail('wa-msg-002');
      expect(before?.errorCode).toBe('RETRIES_EXHAUSTED');
      expect(before?.errorReason).toBe('Max 5 attempts reached after upstream timeouts');

      // Simular reload (Ctrl+R): desmontar, limpar bus, remontar
      unmount();
      __resetSendStatusForTest();
      vi.clearAllMocks();
      mockSelectChain(FIXTURE_ROWS); // DB devolve os mesmos dados

      const { result: result2 } = renderHook(() => useMessageStatus('contact-X'));
      await waitFor(() => expect(result2.current.isLoading).toBe(false));

      const after = result2.current.getMessageStatusDetail('wa-msg-002');
      // Os campos de erro sobrevivem byte-a-byte ao reload
      expect(after?.status).toBe('failed_retries');
      expect(after?.errorCode).toBe('RETRIES_EXHAUSTED');
      expect(after?.errorReason).toBe('Max 5 attempts reached after upstream timeouts');

      // Garantia explícita: nada foi perdido entre as duas renderizações
      expect(after?.errorCode).toBe(before?.errorCode);
      expect(after?.errorReason).toBe(before?.errorReason);
    });
  });

  describe('regression guard: SELECT projection includes error columns', () => {
    it('the hook MUST request error_code and error_reason in select() — otherwise PostgREST omits them', async () => {
      mockSelectChain([]);
      renderHook(() => useMessageStatus('contact-X'));
      await waitFor(() => expect(fromMock).toHaveBeenCalledWith('messages'));

      const selectFn = (fromMock.mock.results[0].value as { select: ReturnType<typeof vi.fn> }).select;
      // Single string projection — must contain both error columns.
      const projection = selectFn.mock.calls[0][0] as string;
      expect(projection).toMatch(/\berror_code\b/);
      expect(projection).toMatch(/\berror_reason\b/);
      expect(projection).toMatch(/\bid\b/);
      expect(projection).toMatch(/\bstatus\b/);
      expect(projection).toMatch(/\bstatus_updated_at\b/);
    });
  });
});
