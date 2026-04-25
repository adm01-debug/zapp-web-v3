import { describe, it, expect, beforeEach, vi } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { queryExternalProxy } from '../externalProxy';
import { getTelemetrySnapshot, resetTelemetry } from '../clientTelemetry';

describe('externalProxy telemetry', () => {
  beforeEach(() => {
    resetTelemetry();
    invokeMock.mockReset();
  });

  it('records ok event on success with recordCount', async () => {
    invokeMock.mockResolvedValue({ data: { data: [1, 2, 3] }, error: null });
    await queryExternalProxy({ table: 'evolution_contacts', limit: 50, offset: 0 });
    const s = getTelemetrySnapshot();
    expect(s.total).toBe(1);
    expect(s.recentEvents[0].recordCount).toBe(3);
    expect(s.recentEvents[0].severity).toBe('ok');
    expect(s.recentEvents[0].limit).toBe(50);
    expect(s.recentEvents[0].target).toBe('evolution_contacts');
  });

  it('propagates filters and offset into the event', async () => {
    invokeMock.mockResolvedValue({ data: { data: [] }, error: null });
    await queryExternalProxy({
      table: 'evolution_messages',
      filters: [{ column: 'remote_jid', operator: 'eq', value: 'x' }],
      limit: 25,
      offset: 100,
    });
    const ev = getTelemetrySnapshot().recentEvents[0];
    expect(ev.filters).toBeTruthy();
    expect(ev.limit).toBe(25);
    expect(ev.offset).toBe(100);
  });

  it('records error event when invoke returns error', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(
      queryExternalProxy({ table: 'evolution_contacts' }),
    ).rejects.toThrow(/boom/);
    const ev = getTelemetrySnapshot().recentEvents[0];
    expect(ev.severity).toBe('error');
    expect(ev.errorMessage).toBe('boom');
  });

  it('records timeout when error name is TimeoutError', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { name: 'TimeoutError', message: 'request timeout' },
    });
    await expect(queryExternalProxy({ table: 't' })).rejects.toThrow();
    const ev = getTelemetrySnapshot().recentEvents[0];
    expect(ev.severity).toBe('timeout');
  });

  it('extracts target from rpc body', async () => {
    invokeMock.mockResolvedValue({ data: { data: [] }, error: null });
    await queryExternalProxy({ action: 'rpc', rpc: 'rpc_list_contacts', params: { p_limit: 10 } });
    const ev = getTelemetrySnapshot().recentEvents[0];
    expect(ev.target).toBe('rpc_list_contacts');
    expect(ev.operation).toBe('rpc');
  });

  it('attaches a correlationId and forwards it via header + body __cid', async () => {
    invokeMock.mockResolvedValue({ data: { data: [] }, error: null });
    await queryExternalProxy({ table: 'evolution_contacts', limit: 10 });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [fnName, options] = invokeMock.mock.calls[0] as [string, {
      body: Record<string, unknown>;
      headers?: Record<string, string>;
    }];
    expect(fnName).toBe('external-db-proxy');
    const cid = options.headers?.['x-correlation-id'];
    expect(cid).toMatch(/^[0-9a-f]{8}$/);
    expect(options.body.__cid).toBe(cid);

    const ev = getTelemetrySnapshot().recentEvents[0];
    expect(ev.correlationId).toBe(cid);
  });

  it('keeps the same correlationId on the recorded error event', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(queryExternalProxy({ table: 't' })).rejects.toThrow(/boom/);

    const [, options] = invokeMock.mock.calls[0] as [string, {
      headers?: Record<string, string>;
    }];
    const cid = options.headers?.['x-correlation-id'];
    const ev = getTelemetrySnapshot().recentEvents[0];
    expect(ev.severity).toBe('error');
    expect(ev.correlationId).toBe(cid);
  });

  it('generates a different correlationId per call', async () => {
    invokeMock.mockResolvedValue({ data: { data: [] }, error: null });
    await queryExternalProxy({ table: 't', limit: 1 });
    await queryExternalProxy({ table: 't', limit: 1 });
    const [c1, c2] = invokeMock.mock.calls.map(([, opts]) =>
      (opts as { headers?: Record<string, string> }).headers?.['x-correlation-id'],
    );
    expect(c1).toBeTruthy();
    expect(c2).toBeTruthy();
    expect(c1).not.toBe(c2);
  });
});
