/**
 * useExternalMessages — broadcast de outra aba atualiza a UI sem rede.
 *
 * Cenário: o hook está montado para um remoteJid e já fez o initial fetch
 * (vazio). Outra aba conclui um `inbox:poll:<jid>:<cursor>` e broadcasta
 * mensagens via BroadcastChannel. O hook deve:
 *   1. Atualizar `messages` (estado React) com os novos itens.
 *   2. NÃO disparar nenhuma chamada extra ao `queryExternalProxy`.
 *
 * Como simular "outra aba" em um único runtime jsdom:
 *   - A própria aba A é a que monta o hook (subscriber registrado).
 *   - Uma "aba B" sintética é representada por um BroadcastChannel separado
 *     postando uma mensagem `{type:'result', key, ownerId:'tabB', data,...}`
 *     no mesmo nome de canal do `crossTabDedupe` (`cross-tab-dedupe`).
 *   - O `onBroadcast` interno ignora ecos da própria aba (`ownerId === TAB_ID`)
 *     mas aceita qualquer outro `ownerId`, então `'tabB'` é suficiente para
 *     simular uma aba diferente sem precisar de `vi.resetModules`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mocka `queryExternalProxy` ANTES de importar o hook. A fábrica do vi.mock
// é hoisted para o topo do arquivo — não pode capturar variáveis externas.
// Por isso definimos o mock inline e expomos via importação dinâmica do mesmo
// módulo no setup.
vi.mock('@/lib/externalProxy', () => ({
  queryExternalProxy: vi.fn(async () => ({ data: [], count: 0 })),
}));

import { useExternalMessages } from '@/hooks/useExternalEvolution';
import { clearCrossTabDedupe } from '@/lib/realtime/crossTabDedupe';
import { queryExternalProxy } from '@/lib/externalProxy';

const queryExternalProxyMock = queryExternalProxy as unknown as ReturnType<typeof vi.fn>;

const BC_NAME = 'cross-tab-dedupe';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function makeRawEvolutionMessage(over: Partial<Record<string, unknown>> = {}) {
  // Campos mínimos consumidos pelo `evolutionToRealtimeMessage`.
  const id = String(over.id ?? `evo-${Math.random().toString(36).slice(2, 8)}`);
  return {
    id,
    message_id: id,
    remote_jid: '5511999999999@s.whatsapp.net',
    from_me: false,
    message_type: 'text',
    content: 'olá vindo da outra aba',
    media_url: null,
    media_mimetype: null,
    media_type: null,
    media_filename: null,
    media_size: null,
    caption: null,
    quoted_message_id: null,
    is_starred: false,
    is_important: false,
    category: null,
    sentiment: null,
    tags: null,
    notes: null,
    follow_up_at: null,
    follow_up_done: false,
    created_at: new Date().toISOString(),
    contact_id: null,
    conversation_id: null,
    direction: 'inbound',
    status: 'received',
    status_at: null,
    sent_by_bot: false,
    template_name: null,
    instance_name: 'wpp2',
    push_name: 'Cliente',
    deleted_at: null,
    ...over,
  };
}

describe('useExternalMessages — broadcast cross-tab atualiza a UI sem rede', () => {
  beforeEach(() => {
    queryExternalProxyMock.mockClear();
    queryExternalProxyMock.mockResolvedValue({ data: [], count: 0 });
    clearCrossTabDedupe();
  });

  afterEach(() => {
    clearCrossTabDedupe();
  });

  it('recebe broadcast de poll de outra aba e atualiza messages SEM chamar a rede de novo', async () => {
    const JID = '5511999999999@s.whatsapp.net';

    // 1. Monta o hook — ele faz o initialFetch (chama proxy 1x e devolve []).
    const { result } = renderHook(() => useExternalMessages(JID));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toEqual([]);
    expect(queryExternalProxyMock).toHaveBeenCalledTimes(1); // 1 = initial

    // Snapshot do contador para asserts pós-broadcast.
    const callsAfterInitial = queryExternalProxyMock.mock.calls.length;

    // 2. Simula "aba B" enviando o resultado de um poll via BroadcastChannel.
    //    O hook está inscrito via subscribeDedupe e deve atualizar o state.
    const tabBChannel = new BroadcastChannel(BC_NAME);
    const newMessages = [
      makeRawEvolutionMessage({ id: 'evo-1', content: 'msg-1', created_at: new Date(Date.now() - 10_000).toISOString() }),
      makeRawEvolutionMessage({ id: 'evo-2', content: 'msg-2', created_at: new Date().toISOString() }),
    ];

    await act(async () => {
      tabBChannel.postMessage({
        type: 'result',
        key: `inbox:poll:${JID}:2026-04-25T22:00:00.000Z`,
        ownerId: 'tabB-synthetic',
        data: newMessages,
        ts: Date.now(),
        resultTtl: 30_000,
      });
      // BroadcastChannel é assíncrono — espera a entrega + setState.
      await sleep(40);
    });

    // 3. Asserts centrais:
    //    a) UI atualizou com as 2 novas mensagens.
    //    b) Nenhuma chamada extra ao proxy de rede.
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });
    expect(result.current.messages.map((m) => m.id)).toEqual(['evo-1', 'evo-2']);
    expect(queryExternalProxyMock).toHaveBeenCalledTimes(callsAfterInitial); // ← sem novo fetch

    tabBChannel.close();
  });

  it('broadcast `older` é prependado e não dispara fetcher de paginação', async () => {
    const JID = '5511988888888@s.whatsapp.net';

    // Initial retorna 1 mensagem para que o hook tenha "âncora" no histórico.
    const initialMsg = makeRawEvolutionMessage({
      id: 'evo-current',
      content: 'mensagem atual',
      created_at: new Date(Date.now() - 60_000).toISOString(),
      remote_jid: JID,
    });
    queryExternalProxyMock.mockResolvedValueOnce({ data: [initialMsg], count: 1 });

    const { result } = renderHook(() => useExternalMessages(JID));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toHaveLength(1);
    const callsAfterInitial = queryExternalProxyMock.mock.calls.length;

    // "Aba B" broadcasta uma página de mensagens MAIS ANTIGAS (older:<jid>:..).
    const tabBChannel = new BroadcastChannel(BC_NAME);
    const olderPage = [
      makeRawEvolutionMessage({
        id: 'evo-old-1',
        content: 'antiga 1',
        created_at: new Date(Date.now() - 600_000).toISOString(),
        remote_jid: JID,
      }),
      makeRawEvolutionMessage({
        id: 'evo-old-2',
        content: 'antiga 2',
        created_at: new Date(Date.now() - 300_000).toISOString(),
        remote_jid: JID,
      }),
    ];

    await act(async () => {
      tabBChannel.postMessage({
        type: 'result',
        key: `older:${JID}:${initialMsg.created_at}:100`,
        ownerId: 'tabB-synthetic',
        // Hook espera `older` em ordem desc (será revertido internamente).
        data: olderPage.slice().reverse(),
        ts: Date.now(),
        resultTtl: 30_000,
      });
      await sleep(40);
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    // Order esperada: [old-1, old-2, current] (ascendente por created_at).
    expect(result.current.messages.map((m) => m.id)).toEqual([
      'evo-old-1',
      'evo-old-2',
      'evo-current',
    ]);
    // Nenhum fetcher novo de paginação foi chamado.
    expect(queryExternalProxyMock).toHaveBeenCalledTimes(callsAfterInitial);

    tabBChannel.close();
  });

  it('broadcast com 0 mensagens não altera o estado nem chama a rede', async () => {
    const JID = '5511977777777@s.whatsapp.net';
    const { result } = renderHook(() => useExternalMessages(JID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const beforeSnapshot = result.current.messages;
    const callsBefore = queryExternalProxyMock.mock.calls.length;

    const ch = new BroadcastChannel(BC_NAME);
    await act(async () => {
      ch.postMessage({
        type: 'result',
        key: `inbox:poll:${JID}:2026-04-25T22:30:00.000Z`,
        ownerId: 'tabB',
        data: [],
        ts: Date.now(),
        resultTtl: 30_000,
      });
      await sleep(30);
    });

    expect(result.current.messages).toBe(beforeSnapshot); // mesma referência
    expect(queryExternalProxyMock).toHaveBeenCalledTimes(callsBefore);
    ch.close();
  });

  it('broadcast para outro jid (não-correspondente ao matcher) NÃO afeta o hook', async () => {
    const JID = '5511966666666@s.whatsapp.net';
    const OTHER_JID = '5511965555555@s.whatsapp.net';
    const { result } = renderHook(() => useExternalMessages(JID));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const before = result.current.messages;
    const callsBefore = queryExternalProxyMock.mock.calls.length;

    const ch = new BroadcastChannel(BC_NAME);
    await act(async () => {
      ch.postMessage({
        type: 'result',
        key: `inbox:poll:${OTHER_JID}:2026-04-25T22:30:00.000Z`,
        ownerId: 'tabB',
        data: [makeRawEvolutionMessage({ id: 'noise', remote_jid: OTHER_JID })],
        ts: Date.now(),
        resultTtl: 30_000,
      });
      await sleep(30);
    });

    expect(result.current.messages).toBe(before); // matcher rejeita — sem mudança
    expect(queryExternalProxyMock).toHaveBeenCalledTimes(callsBefore);
    ch.close();
  });
});
