/**
 * Testes da TRANSAÇÃO ATÔMICA de reconciliação:
 *  - O status (sending<sent<delivered<read<played) é promovido por max-rank
 *    e nunca regride durante a substituição da bolha otimista.
 *  - O estado do player (currentTime, paused, playbackRate) é migrado do id
 *    otimista para o canônico ANTES do React renderizar a nova bolha,
 *    evitando flicker e perda de progresso de PTT.
 *  - Helper `applyReconciliation` executa setMessages + migrate num único
 *    callback do updater (mesma "transação" do ponto de vista do React).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  reconcileOptimistic,
  applyReconciliation,
} from '@/hooks/useExternalEvolution';
import { playerStateStore } from '@/hooks/realtime/playerStateStore';
import type { RealtimeMessage } from '@/features/inbox';

const BASE_TIME = new Date('2026-04-27T10:00:00.000Z').getTime();
const iso = (offsetMs: number) => new Date(BASE_TIME + offsetMs).toISOString();

function makeMsg(overrides: Partial<RealtimeMessage>): RealtimeMessage {
  return {
    id: 'placeholder',
    contact_id: 'c1',
    agent_id: null,
    content: '',
    sender: 'agent',
    message_type: 'text',
    media_url: null,
    is_read: false,
    status: 'sent',
    status_updated_at: null,
    created_at: iso(0),
    updated_at: iso(0),
    external_id: null,
    whatsapp_connection_id: null,
    transcription: null,
    transcription_status: null,
    is_deleted: false,
    ...overrides,
  };
}

describe('reconcileOptimistic — promoção de status (max-rank)', () => {
  it('promove sending → sent quando canônico chega como sent', () => {
    const opt = makeMsg({
      id: 'optimistic:1:t', external_id: 'WA_1',
      content: 'oi', status: 'sending', status_updated_at: iso(0),
    });
    const can = makeMsg({
      id: 'real-1', external_id: 'WA_1',
      content: 'oi', status: 'sent', status_updated_at: iso(500),
      created_at: iso(500),
    });
    const { additions } = reconcileOptimistic([opt], [can]);
    expect(additions).toHaveLength(1);
    expect(additions[0].status).toBe('sent');
    expect(additions[0].status_updated_at).toBe(iso(500));
  });

  it('NÃO regride delivered → sent (otimista venceu)', () => {
    const opt = makeMsg({
      id: 'optimistic:1:t', external_id: 'WA_2',
      content: 'oi', status: 'delivered', status_updated_at: iso(1000),
    });
    const can = makeMsg({
      id: 'real-2', external_id: 'WA_2',
      content: 'oi', status: 'sent', status_updated_at: iso(500),
      created_at: iso(500),
    });
    const { additions } = reconcileOptimistic([opt], [can]);
    expect(additions[0].status).toBe('delivered');
    expect(additions[0].status_updated_at).toBe(iso(1000));
  });

  it('promove read → played (PTT ouvido sobrescreve apenas-lido)', () => {
    const opt = makeMsg({
      id: 'optimistic:1:a',
      content: '[Áudio]', message_type: 'audio',
      status: 'read', status_updated_at: iso(2000),
      media_url: 'blob:http://x/local',
    });
    const can = makeMsg({
      id: 'real-a', message_type: 'audio',
      content: '', external_id: 'WA_A',
      status: 'played', status_updated_at: iso(3000),
      media_url: 'https://cdn/x.ogg',
      created_at: iso(2500),
    });
    const { additions } = reconcileOptimistic([opt], [can]);
    expect(additions[0].status).toBe('played');
    expect(additions[0].status_updated_at).toBe(iso(3000));
  });

  it('em empate de rank, vence o canônico (timestamp do servidor)', () => {
    const opt = makeMsg({
      id: 'optimistic:1:t', external_id: 'WA_3',
      content: 'oi', status: 'sent', status_updated_at: iso(100),
    });
    const can = makeMsg({
      id: 'real-3', external_id: 'WA_3',
      content: 'oi', status: 'sent', status_updated_at: iso(500),
      created_at: iso(500),
    });
    const { additions } = reconcileOptimistic([opt], [can]);
    expect(additions[0].status).toBe('sent');
    expect(additions[0].status_updated_at).toBe(iso(500));
  });

  it('expõe remap optimisticId → canonicalId para todos os matches', () => {
    const optT = makeMsg({ id: 'optimistic:1:t', external_id: 'WA_T', content: 'oi' });
    const optA = makeMsg({
      id: 'optimistic:1:a', message_type: 'audio',
      content: '[Áudio]', media_url: 'blob:x', created_at: iso(1000),
    });
    const canT = makeMsg({ id: 'real-t', external_id: 'WA_T', content: 'oi', created_at: iso(500) });
    const canA = makeMsg({
      id: 'real-a', external_id: 'WA_A', message_type: 'audio',
      content: '', created_at: iso(2000),
    });
    const { remap } = reconcileOptimistic([optT, optA], [canT, canA]);
    expect(remap.size).toBe(2);
    expect(remap.get('optimistic:1:t')).toBe('real-t');
    expect(remap.get('optimistic:1:a')).toBe('real-a');
  });
});

describe('playerStateStore — migração atômica', () => {
  beforeEach(() => playerStateStore._clear());

  it('migra estado completo do id antigo para o novo', () => {
    playerStateStore.set('optimistic:1:a', { currentTime: 12.5, paused: false, playbackRate: 1.5 });
    expect(playerStateStore.get('optimistic:1:a')?.currentTime).toBe(12.5);

    const migrated = playerStateStore.migrate('optimistic:1:a', 'real-a');
    expect(migrated).toBe(true);
    expect(playerStateStore.get('optimistic:1:a')).toBeUndefined();
    const next = playerStateStore.get('real-a');
    expect(next?.currentTime).toBe(12.5);
    expect(next?.paused).toBe(false);
    expect(next?.playbackRate).toBe(1.5);
  });

  it('retorna false quando o id de origem não tem estado', () => {
    expect(playerStateStore.migrate('does-not-exist', 'whatever')).toBe(false);
  });

  it('é idempotente — segunda chamada não quebra nada', () => {
    playerStateStore.set('opt', { currentTime: 5 });
    playerStateStore.migrate('opt', 'real');
    expect(playerStateStore.migrate('opt', 'real')).toBe(false);
    expect(playerStateStore.get('real')?.currentTime).toBe(5);
  });

  it('preserva estado mais novo no destino se já existir', () => {
    playerStateStore.set('opt', { currentTime: 5 });
    // Força destino com updatedAt no futuro para garantir que `migrate`
    // não sobrescreva um estado mais novo.
    const future = Date.now() + 10_000;
    playerStateStore.set('real', { currentTime: 10, paused: false, playbackRate: 1 });
    const newer = playerStateStore.get('real');
    if (newer) (newer as { updatedAt: number }).updatedAt = future;
    playerStateStore.migrate('opt', 'real');
    // O destino tinha updatedAt no futuro — preserva o estado mais novo.
    expect(playerStateStore.get('real')?.currentTime).toBe(10);
  });

  it('notifica listeners no migrate', () => {
    const events: Array<[string, string]> = [];
    const unsub = playerStateStore.onMigrate((from, to) => events.push([from, to]));
    playerStateStore.set('opt', { currentTime: 1 });
    playerStateStore.migrate('opt', 'real');
    expect(events).toEqual([['opt', 'real']]);
    unsub();
    playerStateStore.set('opt2', { currentTime: 2 });
    playerStateStore.migrate('opt2', 'real2');
    expect(events).toHaveLength(1); // listener removido, sem novos eventos
  });
});

describe('applyReconciliation — transação atômica', () => {
  beforeEach(() => playerStateStore._clear());

  it('migra player + atualiza mensagens em UM único setState', () => {
    // Estado inicial: bolha otimista de áudio com player rodando
    playerStateStore.set('optimistic:1:a', {
      currentTime: 7.2, paused: false, playbackRate: 1,
    });
    const opt = makeMsg({
      id: 'optimistic:1:a',
      content: '[Áudio]', message_type: 'audio',
      media_url: 'blob:http://local/audio',
      status: 'sending', status_updated_at: iso(0),
    });
    const can = makeMsg({
      id: 'real-uuid-a',
      content: '', message_type: 'audio',
      external_id: 'WA_AUDIO_X',
      media_url: null, // ainda não baixou
      status: 'sent', status_updated_at: iso(800),
      created_at: iso(500),
    });

    let stateAtUpdate: { hadOptStateAtMigrate: boolean; hasNewState: boolean } | null = null;
    let setStateCallCount = 0;

    const setMessages = (updater: (prev: RealtimeMessage[]) => RealtimeMessage[]) => {
      setStateCallCount += 1;
      // Antes do updater rodar, o estado ainda está no id antigo.
      const beforeOld = playerStateStore.get('optimistic:1:a');
      expect(beforeOld?.currentTime).toBe(7.2);
      const next = updater([opt]);
      // Depois do updater, o estado já está no id novo (migração aconteceu DENTRO do updater).
      stateAtUpdate = {
        hadOptStateAtMigrate: !!beforeOld,
        hasNewState: !!playerStateStore.get('real-uuid-a'),
      };
      // Validações finais
      expect(playerStateStore.get('optimistic:1:a')).toBeUndefined();
      const newSt = playerStateStore.get('real-uuid-a');
      expect(newSt?.currentTime).toBe(7.2);
      expect(newSt?.paused).toBe(false);
      // E a mensagem foi reconciliada com status promovido + media_url herdada
      expect(next).toHaveLength(1);
      expect(next[0].id).toBe('real-uuid-a');
      expect(next[0].status).toBe('sent'); // sending → sent
      expect(next[0].media_url).toBe('blob:http://local/audio'); // herdou
      return next;
    };

    const result = applyReconciliation(setMessages, [can], (filteredPrev, additions) => {
      return [...filteredPrev, ...additions];
    });

    expect(setStateCallCount).toBe(1); // UMA única transação
    expect(result.remapSize).toBe(1);
    expect(stateAtUpdate).toEqual({ hadOptStateAtMigrate: true, hasNewState: true });
  });

  it('não migra player quando não há estado no id otimista (no-op seguro)', () => {
    const opt = makeMsg({ id: 'optimistic:1:t', external_id: 'WA_X', content: 'oi' });
    const can = makeMsg({ id: 'real-t', external_id: 'WA_X', content: 'oi', created_at: iso(500) });
    const result = applyReconciliation(
      (u) => { u([opt]); },
      [can],
      (fp, ad) => [...fp, ...ad],
    );
    expect(result.remapSize).toBe(1);
    expect(playerStateStore._size()).toBe(0);
  });

  it('curto-circuita quando incoming está vazio (sem custo)', () => {
    let called = false;
    const result = applyReconciliation(
      (u) => { u([]); called = true; },
      [],
      (fp, ad) => [...fp, ...ad],
    );
    expect(called).toBe(true);
    expect(result.remapSize).toBe(0);
  });

  it('promove status DURANTE a mesma transação que migra o player', () => {
    playerStateStore.set('optimistic:1:a', { currentTime: 3, paused: true });
    const opt = makeMsg({
      id: 'optimistic:1:a', message_type: 'audio',
      content: '[Áudio]', media_url: 'blob:y',
      status: 'delivered', status_updated_at: iso(2000),
    });
    // Webhook canônico chega ANTES do delivered ack chegar (status: sent)
    const can = makeMsg({
      id: 'real-y', message_type: 'audio',
      content: '', external_id: 'WA_Y',
      status: 'sent', status_updated_at: iso(1500),
      media_url: 'https://cdn/y.ogg',
      created_at: iso(1000),
    });
    let final: RealtimeMessage[] = [];
    applyReconciliation(
      (updater) => { final = updater([opt]); },
      [can],
      (fp, ad) => [...fp, ...ad],
    );
    // Não regrediu: delivered preservado
    expect(final[0].status).toBe('delivered');
    expect(final[0].status_updated_at).toBe(iso(2000));
    // Player migrado
    expect(playerStateStore.get('real-y')?.currentTime).toBe(3);
    expect(playerStateStore.get('optimistic:1:a')).toBeUndefined();
  });
});
