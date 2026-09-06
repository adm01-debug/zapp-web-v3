import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInvoke = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: mockInvoke,
    },
  },
}));

vi.mock('@/lib/logger');

import { invokeEdge } from '../edgeFunctions';
import { newTraceContext } from '@/lib/tracing';

describe('invokeEdge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
  });

  it('injeta traceparent W3C no invoke', async () => {
    await invokeEdge('my-function', { body: { x: 1 } });

    expect(mockInvoke).toHaveBeenCalledOnce();
    const [name, opts] = mockInvoke.mock.calls[0];
    expect(name).toBe('my-function');
    expect(opts.headers['traceparent']).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });

  it('injeta x-trace-id consistente com o traceparent', async () => {
    await invokeEdge('fn-x');

    const [, opts] = mockInvoke.mock.calls[0];
    const traceId = opts.headers['traceparent'].split('-')[1];
    expect(opts.headers['x-trace-id']).toBe(traceId);
  });

  it('injeta x-correlation-id', async () => {
    await invokeEdge('fn-x');
    const [, opts] = mockInvoke.mock.calls[0];
    expect(opts.headers['x-correlation-id']).toMatch(/^[0-9a-f]{8}$/);
  });

  it('usa TraceContext fornecido sem gerar novo', async () => {
    const ctx = newTraceContext();
    await invokeEdge('fn-x', { traceCtx: ctx });

    const [, opts] = mockInvoke.mock.calls[0];
    expect(opts.headers['traceparent']).toBe(ctx.traceparent);
    expect(opts.headers['x-trace-id']).toBe(ctx.traceId);
  });

  it('headers extras têm precedência sobre os gerados', async () => {
    await invokeEdge('fn-x', {
      headers: { 'x-custom': 'value', traceparent: 'custom-parent' },
    });

    const [, opts] = mockInvoke.mock.calls[0];
    expect(opts.headers['x-custom']).toBe('value');
    expect(opts.headers['traceparent']).toBe('custom-parent');
  });

  it('passa body e method para o invoke', async () => {
    await invokeEdge('fn-x', { body: { a: 1 }, method: 'POST' });

    const [, opts] = mockInvoke.mock.calls[0];
    expect(opts.body).toEqual({ a: 1 });
    expect(opts.method).toBe('POST');
  });

  it('retorna data e error do invoke sem modificar', async () => {
    mockInvoke.mockResolvedValue({ data: { result: 42 }, error: null });

    const { data, error } = await invokeEdge('fn-x');
    expect(data).toEqual({ result: 42 });
    expect(error).toBeNull();
  });
});
