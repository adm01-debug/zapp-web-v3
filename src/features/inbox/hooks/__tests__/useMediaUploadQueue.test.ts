import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const uploadMock = vi.fn();
const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });
const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'agent-1' } } }) },
    from: () => ({ insert: insertMock, update: updateMock }),
    storage: { from: () => ({ upload: uploadMock }) },
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/utils/whatsappFileTypes', () => ({
  validateFile: (f: File) => {
    if (f.name.includes('bad')) return { valid: false, error: 'Tipo proibido' };
    if (f.size > 50 * 1024 * 1024) return { valid: false, error: 'Muito grande' };
    return { valid: true, category: f.type.startsWith('image') ? 'image' : 'document' };
  },
}));

import { useMediaUploadQueue } from '../useMediaUploadQueue';

const file = (name: string, type = 'image/png', size = 1024) => {
  const f = new File([new Uint8Array(size)], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

beforeEach(() => {
  uploadMock.mockReset();
  insertMock.mockClear();
  updateMock.mockClear();
});

describe('useMediaUploadQueue', () => {
  it('rejeita arquivos inválidos sem chamar storage', async () => {
    uploadMock.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useMediaUploadQueue('contact-1'));
    await waitFor(() => expect((result.current as any).queue).toBeDefined());
    await act(async () => {
      await result.current.addToQueue(file('bad.exe', 'application/x-msdownload'));
    });
    expect(result.current.queue[0].status).toBe('failed');
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('faz upload com sucesso e marca uploaded', async () => {
    uploadMock.mockResolvedValue({ data: { path: 'x' }, error: null });
    const { result } = renderHook(() => useMediaUploadQueue('contact-1'));
    await act(async () => {
      await result.current.addToQueue(file('good.png'));
    });
    await waitFor(() => expect(result.current.queue[0].status).toBe('uploaded'));
    expect(result.current.queue[0].progress).toBe(100);
  });

  it('aplica retry automático até maxRetries em falha', async () => {
    uploadMock.mockResolvedValue({ data: null, error: { message: 'network' } });
    const { result } = renderHook(() => useMediaUploadQueue('contact-1'));
    await act(async () => {
      await result.current.addToQueue(file('flaky.png'), { maxRetries: 2 });
    });
    await waitFor(() => expect(result.current.queue[0].status).toBe('failed'), { timeout: 8000 });
    // 1 try + 2 retries = 3 total
    expect(uploadMock).toHaveBeenCalledTimes(3);
    expect(result.current.hasFailed).toBe(true);
  }, 15000);

  it('reenvio manual após falha funciona', async () => {
    uploadMock.mockResolvedValueOnce({ data: null, error: { message: 'fail' } })
      .mockResolvedValueOnce({ data: { path: 'ok' }, error: null });
    const { result } = renderHook(() => useMediaUploadQueue('contact-1'));
    await act(async () => {
      await result.current.addToQueue(file('a.png'), { maxRetries: 0 });
    });
    await waitFor(() => expect(result.current.queue[0].status).toBe('failed'));
    await act(async () => { result.current.retryUpload(result.current.queue[0].id); });
    await waitFor(() => expect(result.current.queue[0].status).toBe('uploaded'), { timeout: 8000 });
  }, 15000);

  it('processa múltiplos arquivos com falhas parciais isoladas', async () => {
    uploadMock
      .mockResolvedValueOnce({ data: { path: 'a' }, error: null })
      .mockResolvedValue({ data: null, error: { message: 'boom' } });
    const { result } = renderHook(() => useMediaUploadQueue('contact-1'));
    await act(async () => {
      await result.current.addManyToQueue([file('ok.png'), file('bad-net.png')], { maxRetries: 0 });
    });
    await waitFor(() => {
      const statuses = result.current.queue.map((q) => q.status).sort();
      expect(statuses).toEqual(['failed', 'uploaded']);
    }, { timeout: 8000 });
  }, 15000);
});
