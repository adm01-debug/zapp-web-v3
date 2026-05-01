import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const invokeMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));
vi.mock('@/lib/logger', () => ({ getLogger: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => toastErrorMock(...args) } }));

import { useMediaUrl } from '@/features/inbox';

const baseOpts = {
  instanceName: 'wpp2',
  originalUrl: 'https://expired.example/x.jpg',
  messageKey: { remoteJid: '5511@s.whatsapp.net', fromMe: false, id: 'ABC-1' },
};

describe('useMediaUrl — tratamento de erro', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('classifica erro 410 como "expired" com mensagem clara', async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error('HTTP 410 Gone') });
    const { result } = renderHook(() => useMediaUrl({ ...baseOpts, messageKey: { ...baseOpts.messageKey, id: 'expired-1' } }));

    await act(async () => { await result.current.retry(); });

    expect(result.current.error?.reason).toBe('expired');
    expect(result.current.error?.message).toMatch(/expirou no WhatsApp/i);
  });

  it('classifica erro 404 como "not_found"', async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error('HTTP 404 not_found') });
    const { result } = renderHook(() => useMediaUrl({ ...baseOpts, messageKey: { ...baseOpts.messageKey, id: 'nf-1' } }));

    await act(async () => { await result.current.retry(); });

    expect(result.current.error?.reason).toBe('not_found');
  });

  it('classifica falha de rede como "network"', async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error('Failed to fetch') });
    const { result } = renderHook(() => useMediaUrl({ ...baseOpts, messageKey: { ...baseOpts.messageKey, id: 'net-1' } }));

    await act(async () => { await result.current.retry(); });

    expect(result.current.error?.reason).toBe('network');
  });

  it('marca failed=true após esgotar maxAttempts e dispara toast único', async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error('HTTP 410 Gone') });
    const { result } = renderHook(() =>
      useMediaUrl({ ...baseOpts, messageKey: { ...baseOpts.messageKey, id: 'fail-1' }, maxAttempts: 2 }),
    );

    await act(async () => { await result.current.retry(); });
    expect(result.current.failed).toBe(false);
    expect(result.current.attempts).toBe(1);

    await act(async () => { await result.current.onError(); });
    expect(result.current.failed).toBe(true);
    expect(result.current.attempts).toBe(2);
    expect(toastErrorMock).toHaveBeenCalledTimes(1);
    expect(toastErrorMock.mock.calls[0][0]).toBe('Mídia indisponível');

    // onError adicional após failed=true vira no-op (não chama supabase de novo).
    invokeMock.mockClear();
    await act(async () => { await result.current.onError(); });
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('retry manual zera o contador e permite nova tentativa após failed', async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error('HTTP 410 Gone') });
    const { result } = renderHook(() =>
      useMediaUrl({ ...baseOpts, messageKey: { ...baseOpts.messageKey, id: 'retry-1' }, maxAttempts: 1 }),
    );

    await act(async () => { await result.current.retry(); });
    expect(result.current.failed).toBe(true);

    // Próxima invocação retorna sucesso → retry deve voltar a uma URL válida.
    invokeMock.mockResolvedValue({ data: { base64: 'ZmFrZQ==', mimetype: 'image/jpeg' }, error: null });
    await act(async () => { await result.current.retry(); });

    expect(result.current.failed).toBe(false);
    expect(result.current.attempts).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.url).toMatch(/^data:image\/jpeg;base64,/);
  });
});
