import { describe, it, expect } from 'vitest';
import {
  createInvokeMock,
  ok,
  fail,
  type InvokeOptions,
  type InvokeResponse,
} from '../mocks/supabaseFunctions';

interface ConnectionsBody {
  instanceName: string;
}
interface ConnectionsData {
  connections: Array<{ id: string; name: string }>;
}

describe('supabaseFunctions mock helper', () => {
  it('typed body access on call args is type-safe (no `any`)', async () => {
    const invoke = createInvokeMock<ConnectionsData, ConnectionsBody>();
    invoke.mockResolvedValue(ok({ connections: [{ id: '1', name: 'wpp2' }] }));

    const res = await invoke('connection-health-check', { body: { instanceName: 'wpp2' } });

    // result.data is typed — no `result.success` would compile.
    expect(res.data?.connections[0].name).toBe('wpp2');
    expect(res.error).toBeNull();

    // Inspect call args with typed body — no cast needed.
    const [name, opts] = invoke.mock.calls[0] as [string, InvokeOptions<ConnectionsBody>];
    expect(name).toBe('connection-health-check');
    expect(opts.body?.instanceName).toBe('wpp2');
  });

  it('fail() builds an error envelope with typed shape', async () => {
    const invoke = createInvokeMock<ConnectionsData>();
    invoke.mockResolvedValue(fail('network down', 503));
    const res: InvokeResponse<ConnectionsData> = await invoke('x');
    expect(res.data).toBeNull();
    expect(res.error?.message).toBe('network down');
    expect(res.error?.status).toBe(503);
  });

  it('default mock resolves to a safe empty envelope', async () => {
    const invoke = createInvokeMock();
    const res = await invoke('anything');
    expect(res).toEqual({ data: null, error: null });
  });
});
