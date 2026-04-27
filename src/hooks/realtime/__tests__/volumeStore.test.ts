import { describe, it, expect, beforeEach } from 'vitest';
import { volumeStore } from '@/hooks/realtime/volumeStore';

describe('volumeStore — hierarquia conversation > global', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('retorna 1 (default) quando nada está salvo', () => {
    expect(volumeStore.getGlobal()).toBe(1);
    expect(volumeStore.getEffective()).toBe(1);
    expect(volumeStore.getEffective('5511@c.us')).toBe(1);
    expect(volumeStore.getConversation('5511@c.us')).toBeNull();
  });

  it('persiste e lê o volume global', () => {
    volumeStore.setGlobal(0.6);
    expect(volumeStore.getGlobal()).toBe(0.6);
    expect(volumeStore.getEffective()).toBe(0.6);
    expect(volumeStore.getEffective('outra')).toBe(0.6); // sem override
  });

  it('override por conversa ganha sobre o global', () => {
    volumeStore.setGlobal(0.4);
    volumeStore.setConversation('5511@c.us', 0.9);
    expect(volumeStore.getEffective('5511@c.us')).toBe(0.9);
    expect(volumeStore.getEffective('outra')).toBe(0.4);
    expect(volumeStore.getEffective()).toBe(0.4);
  });

  it('clearConversation volta a usar o global', () => {
    volumeStore.setGlobal(0.3);
    volumeStore.setConversation('jid', 0.8);
    expect(volumeStore.getEffective('jid')).toBe(0.8);
    volumeStore.clearConversation('jid');
    expect(volumeStore.getEffective('jid')).toBe(0.3);
    expect(volumeStore.getConversation('jid')).toBeNull();
  });

  it('clamp em [0..1] e descarta NaN', () => {
    volumeStore.setGlobal(2);
    expect(volumeStore.getGlobal()).toBe(1);
    volumeStore.setGlobal(-0.5);
    expect(volumeStore.getGlobal()).toBe(0);
    volumeStore.setConversation('j', NaN);
    expect(volumeStore.getConversation('j')).toBe(1); // default ao recuperar NaN
  });

  it('subscribe recebe escopo correto e conversationId', () => {
    const events: Array<{ v: number; scope: string; id?: string }> = [];
    const unsub = volumeStore.subscribe((v, scope, id) => {
      events.push({ v, scope, id });
    });

    volumeStore.setGlobal(0.5);
    volumeStore.setConversation('abc', 0.7);
    volumeStore.clearConversation('abc');

    expect(events[0]).toEqual({ v: 0.5, scope: 'global', id: undefined });
    expect(events[1]).toEqual({ v: 0.7, scope: 'conversation', id: 'abc' });
    // clearConversation emite o volume global atual no escopo 'conversation'
    expect(events[2]).toEqual({ v: 0.5, scope: 'conversation', id: 'abc' });

    unsub();
    volumeStore.setGlobal(0.1);
    expect(events).toHaveLength(3); // não recebe mais após unsub
  });

  it('isolamento entre conversas diferentes', () => {
    volumeStore.setConversation('a', 0.2);
    volumeStore.setConversation('b', 0.8);
    expect(volumeStore.getEffective('a')).toBe(0.2);
    expect(volumeStore.getEffective('b')).toBe(0.8);
  });
});
