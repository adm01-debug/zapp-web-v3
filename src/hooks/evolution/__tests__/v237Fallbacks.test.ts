import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock externalClient ANTES de importar o módulo sob teste ───
const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/externalClient', () => ({
  externalSupabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
  isExternalConfigured: true,
}));

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

import {
  withV237Fallback,
  isEndpointUnavailable,
  fallbackFindChats,
  fallbackFindContacts,
  fallbackFetchProfile,
} from '../v237Fallbacks';

beforeEach(() => {
  rpcMock.mockReset();
});

describe('isEndpointUnavailable', () => {
  it.each([
    [{ status: 404 }, true],
    [{ status: 405 }, true],
    [{ status: 501 }, true],
    [{ status: 500 }, false],
    [{ status: 200 }, false],
    [new Error('Endpoint not found'), true],
    [new Error('Method Not Allowed'), true],
    [new Error('Not Implemented'), true],
    [new Error('boom 404'), true],
    [new Error('timeout'), false],
    ['404', true],
    ['random failure', false],
    [null, false],
    [undefined, false],
  ])('classifica %o → %s', (input, expected) => {
    expect(isEndpointUnavailable(input as unknown)).toBe(expected);
  });
});

describe('withV237Fallback', () => {
  it('retorna o resultado primário quando ele resolve normalmente', async () => {
    const primary = vi.fn().mockResolvedValue({ ok: true });
    const fallback = vi.fn();
    const result = await withV237Fallback(primary, fallback, 'test');
    expect(result).toEqual({ ok: true });
    expect(fallback).not.toHaveBeenCalled();
  });

  it('cai para o fallback quando o primário lança 404', async () => {
    const err = Object.assign(new Error('Not Found'), { status: 404 });
    const primary = vi.fn().mockRejectedValue(err);
    const fallback = vi.fn().mockResolvedValue([{ id: 'fx-1' }]);
    const result = await withV237Fallback(primary, fallback, 'findChats');
    expect(result).toEqual([{ id: 'fx-1' }]);
    expect(fallback).toHaveBeenCalledOnce();
  });

  it('cai para o fallback em 405 e 501', async () => {
    const fallback = vi.fn().mockResolvedValue('fx');
    await withV237Fallback(
      vi.fn().mockRejectedValue(Object.assign(new Error('x'), { status: 405 })),
      fallback,
      't',
    );
    await withV237Fallback(
      vi.fn().mockRejectedValue(Object.assign(new Error('x'), { status: 501 })),
      fallback,
      't',
    );
    expect(fallback).toHaveBeenCalledTimes(2);
  });

  it('propaga erros que NÃO são endpoint-unavailable', async () => {
    const err = Object.assign(new Error('database exploded'), { status: 500 });
    const primary = vi.fn().mockRejectedValue(err);
    const fallback = vi.fn();
    await expect(withV237Fallback(primary, fallback, 't')).rejects.toThrow('database exploded');
    expect(fallback).not.toHaveBeenCalled();
  });

  it('detecta payload `{ error: "not_found" }` retornado sem throw', async () => {
    const primary = vi.fn().mockResolvedValue({ error: 'not_found' });
    const fallback = vi.fn().mockResolvedValue({ ok: true, source: 'fx' });
    const result = await withV237Fallback(primary, fallback, 'fetchProfile');
    expect(result).toEqual({ ok: true, source: 'fx' });
  });

  it('detecta payload `{ status: 404 }` retornado sem throw', async () => {
    const primary = vi.fn().mockResolvedValue({ status: 404, message: 'nope' });
    const fallback = vi.fn().mockResolvedValue([]);
    await withV237Fallback(primary, fallback, 'findChats');
    expect(fallback).toHaveBeenCalledOnce();
  });

  it('mantém payload válido (status 200) sem invocar fallback', async () => {
    const primary = vi.fn().mockResolvedValue({ status: 200, data: [1, 2] });
    const fallback = vi.fn();
    const result = await withV237Fallback(primary, fallback, 't');
    expect(result).toEqual({ status: 200, data: [1, 2] });
    expect(fallback).not.toHaveBeenCalled();
  });
});

describe('fallbackFindChats', () => {
  it('chama rpc_list_conversations com a instância e retorna o array', async () => {
    rpcMock.mockResolvedValue({ data: [{ remote_jid: '1@s.whatsapp.net' }], error: null });
    const result = await fallbackFindChats('wpp2');
    expect(rpcMock).toHaveBeenCalledWith('rpc_list_conversations', {
      p_instance: 'wpp2',
      p_status: null,
      p_assigned_to: null,
      p_limit: 200,
    });
    expect(result).toEqual([{ remote_jid: '1@s.whatsapp.net' }]);
  });

  it('respeita limit customizado', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    await fallbackFindChats('wpp2', 50);
    expect(rpcMock).toHaveBeenCalledWith('rpc_list_conversations', expect.objectContaining({ p_limit: 50 }));
  });

  it('retorna [] quando data é null/undefined', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    expect(await fallbackFindChats('wpp2')).toEqual([]);
  });

  it('propaga erro da RPC', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'rls denied' } });
    await expect(fallbackFindChats('wpp2')).rejects.toMatchObject({ message: 'rls denied' });
  });
});

describe('fallbackFindContacts', () => {
  it('chama rpc_list_contacts com defaults coerentes', async () => {
    rpcMock.mockResolvedValue({ data: [{ remote_jid: '1@s.whatsapp.net' }], error: null });
    const result = await fallbackFindContacts('wpp2');
    expect(rpcMock).toHaveBeenCalledWith('rpc_list_contacts', {
      p_instance: 'wpp2',
      p_lead_status: null,
      p_assigned_to: null,
      p_search: null,
      p_limit: 500,
      p_offset: 0,
    });
    expect(result).toHaveLength(1);
  });

  it('retorna [] quando data não é array', async () => {
    rpcMock.mockResolvedValue({ data: undefined, error: null });
    expect(await fallbackFindContacts('wpp2')).toEqual([]);
  });
});

describe('fallbackFetchProfile', () => {
  it('chama rpc_get_contact com remote_jid e instância', async () => {
    rpcMock.mockResolvedValue({ data: { remote_jid: '5511@s.whatsapp.net', push_name: 'João' }, error: null });
    const result = await fallbackFetchProfile('5511@s.whatsapp.net', 'wpp2');
    expect(rpcMock).toHaveBeenCalledWith('rpc_get_contact', {
      p_remote_jid: '5511@s.whatsapp.net',
      p_instance: 'wpp2',
    });
    expect(result).toEqual({ remote_jid: '5511@s.whatsapp.net', push_name: 'João' });
  });

  it('retorna null quando contato não existe', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    expect(await fallbackFetchProfile('inexistente', 'wpp2')).toBeNull();
  });

  it('propaga erro da RPC', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(fallbackFetchProfile('x', 'wpp2')).rejects.toMatchObject({ message: 'boom' });
  });
});

describe('integração — withV237Fallback + fallbacks específicos', () => {
  it('findChats: 404 do primário → resultado do FATOR X', async () => {
    rpcMock.mockResolvedValue({ data: [{ remote_jid: 'fx@s.whatsapp.net' }], error: null });
    const primary = vi.fn().mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }));
    const result = await withV237Fallback(primary, () => fallbackFindChats('wpp2'), 'findChats');
    expect(result).toEqual([{ remote_jid: 'fx@s.whatsapp.net' }]);
    expect(rpcMock).toHaveBeenCalledWith('rpc_list_conversations', expect.objectContaining({ p_instance: 'wpp2' }));
  });

  it('fetchProfile: payload not_found → resultado do FATOR X', async () => {
    rpcMock.mockResolvedValue({ data: { remote_jid: '5511@s.whatsapp.net' }, error: null });
    const primary = vi.fn().mockResolvedValue({ error: 'not_found' });
    const result = await withV237Fallback(
      primary,
      () => fallbackFetchProfile('5511@s.whatsapp.net', 'wpp2'),
      'fetchProfile',
    );
    expect(result).toEqual({ remote_jid: '5511@s.whatsapp.net' });
  });
});
