/**
 * Reconciliation tests — guarantee that the optimistic bubble shown right
 * after `sendExternalText` / `sendExternalAudio` is correctly replaced by the
 * canonical row that arrives later via webhook/poll, without producing
 * duplicates and without losing the local media URL.
 *
 * Critical invariants covered:
 *  1. Text — match by `external_id` when present (post-2step send).
 *  2. Text fallback — sender + content + ±2min when `external_id` not set yet.
 *  3. Audio with empty `content` (canonical row from webhook) — must reconcile
 *     against optimistic `'[Áudio]'` placeholder via type+sender+window.
 *  4. Image / video / document / sticker — same fallback as audio.
 *  5. Inheritance — canonical without `media_url` inherits the optimistic
 *     local blob URL so the player doesn't blink while the backend resolves.
 *  6. Outside the ±2min window the optimistic must NOT be reconciled.
 *  7. Same-id de-dup against `prev` keeps the timeline stable.
 */
import { describe, it, expect } from 'vitest';
import { reconcileOptimistic } from '@/hooks/useExternalEvolution';
import type { RealtimeMessage } from '@/hooks/useRealtimeMessages';

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

describe('reconcileOptimistic — text', () => {
  it('removes optimistic when external_id matches an incoming canonical row', () => {
    const optimistic = makeMsg({
      id: 'optimistic:1:abc',
      content: 'olá',
      external_id: 'WA_MSG_42',
    });
    const canonical = makeMsg({
      id: 'real-uuid-1',
      content: 'olá',
      external_id: 'WA_MSG_42',
      created_at: iso(500),
    });
    const { filteredPrev, additions } = reconcileOptimistic([optimistic], [canonical]);
    expect(filteredPrev).toHaveLength(0);
    expect(additions).toEqual([canonical]);
  });

  it('falls back to sender+content+window when external_id is missing', () => {
    const optimistic = makeMsg({ id: 'optimistic:1:abc', content: 'oi' });
    const canonical = makeMsg({
      id: 'real-uuid-2',
      content: 'oi',
      external_id: 'WA_MSG_43',
      created_at: iso(30_000),
    });
    const { filteredPrev, additions } = reconcileOptimistic([optimistic], [canonical]);
    expect(filteredPrev).toHaveLength(0);
    expect(additions).toEqual([canonical]);
  });

  it('does NOT reconcile when canonical arrives outside the ±2min window', () => {
    const optimistic = makeMsg({ id: 'optimistic:1:abc', content: 'oi' });
    const canonical = makeMsg({
      id: 'real-uuid-3',
      content: 'oi',
      external_id: 'WA_MSG_44',
      created_at: iso(3 * 60_000), // 3 min — fora da janela
    });
    const { filteredPrev, additions } = reconcileOptimistic([optimistic], [canonical]);
    expect(filteredPrev).toEqual([optimistic]);
    expect(additions).toEqual([canonical]);
  });
});

describe('reconcileOptimistic — audio (webhook content vazio)', () => {
  it('reconciles audio optimistic ([Áudio] + blob:) with canonical { content: "" }', () => {
    const optimistic = makeMsg({
      id: 'optimistic:1:audio',
      content: '[Áudio]',
      message_type: 'audio',
      media_url: 'blob:http://localhost/abc-123',
    });
    // Canonical do webhook: content vazio, media_url já resolvida
    const canonical = makeMsg({
      id: 'real-uuid-audio',
      content: '',
      message_type: 'audio',
      external_id: 'WA_AUDIO_1',
      media_url: 'https://cdn.evolution/audio/xyz.ogg',
      created_at: iso(5_000),
    });
    const { filteredPrev, additions } = reconcileOptimistic([optimistic], [canonical]);
    expect(filteredPrev).toHaveLength(0);
    expect(additions).toHaveLength(1);
    expect(additions[0].id).toBe('real-uuid-audio');
    expect(additions[0].media_url).toBe('https://cdn.evolution/audio/xyz.ogg');
  });

  it('canonical without media_url inherits the optimistic blob URL (no flicker)', () => {
    const optimistic = makeMsg({
      id: 'optimistic:1:audio',
      content: '[Áudio]',
      message_type: 'audio',
      media_url: 'blob:http://localhost/local-blob',
    });
    // Webhook chegou antes do download — media_url ainda null
    const canonical = makeMsg({
      id: 'real-uuid-audio-2',
      content: '',
      message_type: 'audio',
      external_id: 'WA_AUDIO_2',
      media_url: null,
      created_at: iso(2_000),
    });
    const { filteredPrev, additions } = reconcileOptimistic([optimistic], [canonical]);
    expect(filteredPrev).toHaveLength(0);
    expect(additions).toHaveLength(1);
    expect(additions[0].id).toBe('real-uuid-audio-2');
    // Herdou media_url da otimista
    expect(additions[0].media_url).toBe('blob:http://localhost/local-blob');
  });

  it('does not inherit when canonical already has its own media_url', () => {
    const optimistic = makeMsg({
      id: 'optimistic:1:audio',
      content: '[Áudio]',
      message_type: 'audio',
      media_url: 'blob:http://localhost/old-blob',
    });
    const canonical = makeMsg({
      id: 'real-uuid-audio-3',
      content: '',
      message_type: 'audio',
      external_id: 'WA_AUDIO_3',
      media_url: 'https://cdn.evolution/audio/final.ogg',
      created_at: iso(1_000),
    });
    const { additions } = reconcileOptimistic([optimistic], [canonical]);
    expect(additions[0].media_url).toBe('https://cdn.evolution/audio/final.ogg');
  });
});

describe('reconcileOptimistic — outras mídias com content vazio', () => {
  it.each([
    ['image', '[Imagem]'],
    ['video', '[Vídeo]'],
    ['document', '[Documento]'],
    ['sticker', '[Sticker]'],
  ])('reconciles %s optimistic with empty-content canonical', (mediaType, placeholder) => {
    const optimistic = makeMsg({
      id: `optimistic:1:${mediaType}`,
      content: placeholder,
      message_type: mediaType,
      media_url: `blob:http://localhost/${mediaType}-local`,
    });
    const canonical = makeMsg({
      id: `real-uuid-${mediaType}`,
      content: '',
      message_type: mediaType,
      external_id: `WA_${mediaType.toUpperCase()}_1`,
      media_url: `https://cdn.evolution/${mediaType}/final`,
      created_at: iso(10_000),
    });
    const { filteredPrev, additions } = reconcileOptimistic([optimistic], [canonical]);
    expect(filteredPrev).toHaveLength(0);
    expect(additions).toHaveLength(1);
    expect(additions[0].id).toBe(`real-uuid-${mediaType}`);
    expect(additions[0].message_type).toBe(mediaType);
  });

  it('media reconciliation is restricted to matching message_type', () => {
    const audioOpt = makeMsg({
      id: 'optimistic:1:audio',
      content: '[Áudio]',
      message_type: 'audio',
      media_url: 'blob:http://localhost/aud',
    });
    // Canonical é image — NÃO deve casar com optimistic audio
    const imageCanon = makeMsg({
      id: 'real-uuid-img',
      content: '',
      message_type: 'image',
      external_id: 'WA_IMG_1',
      media_url: 'https://cdn.evolution/img/final.jpg',
      created_at: iso(5_000),
    });
    const { filteredPrev, additions } = reconcileOptimistic([audioOpt], [imageCanon]);
    expect(filteredPrev).toEqual([audioOpt]); // optimistic audio preservada
    expect(additions).toEqual([imageCanon]);
  });
});

describe('reconcileOptimistic — invariants gerais', () => {
  it('returns prev untouched when incoming is empty', () => {
    const prev = [makeMsg({ id: 'optimistic:1:x', content: 'a' })];
    const result = reconcileOptimistic(prev, []);
    expect(result.filteredPrev).toBe(prev);
    expect(result.additions).toEqual([]);
  });

  it('preserves non-optimistic prev rows even on id collision via external_id', () => {
    const realPrev = makeMsg({
      id: 'real-uuid-old',
      external_id: 'WA_OLD',
      content: 'antiga',
    });
    const incoming = makeMsg({
      id: 'real-uuid-new',
      external_id: 'WA_NEW',
      content: 'nova',
      created_at: iso(60_000),
    });
    const { filteredPrev, additions } = reconcileOptimistic([realPrev], [incoming]);
    expect(filteredPrev).toEqual([realPrev]);
    expect(additions).toEqual([incoming]);
  });

  it('dedupes incoming whose id is already in filteredPrev', () => {
    const existing = makeMsg({ id: 'real-uuid-1', external_id: 'WA_1', content: 'oi' });
    const duplicate = { ...existing };
    const { filteredPrev, additions } = reconcileOptimistic([existing], [duplicate]);
    expect(filteredPrev).toEqual([existing]);
    expect(additions).toEqual([]);
  });

  it('reconciles multiple optimistics in a single pass (text + audio)', () => {
    const textOpt = makeMsg({
      id: 'optimistic:1:t',
      content: 'olá',
      external_id: 'WA_T',
    });
    const audioOpt = makeMsg({
      id: 'optimistic:1:a',
      content: '[Áudio]',
      message_type: 'audio',
      media_url: 'blob:http://localhost/a',
      created_at: iso(1_000),
    });
    const textCanon = makeMsg({
      id: 'real-t',
      content: 'olá',
      external_id: 'WA_T',
      created_at: iso(500),
    });
    const audioCanon = makeMsg({
      id: 'real-a',
      content: '',
      message_type: 'audio',
      external_id: 'WA_A',
      media_url: null,
      created_at: iso(2_000),
    });
    const { filteredPrev, additions } = reconcileOptimistic(
      [textOpt, audioOpt],
      [textCanon, audioCanon],
    );
    expect(filteredPrev).toHaveLength(0);
    expect(additions).toHaveLength(2);
    expect(additions.map((m) => m.id).sort()).toEqual(['real-a', 'real-t']);
    const audioOut = additions.find((m) => m.id === 'real-a');
    expect(audioOut?.media_url).toBe('blob:http://localhost/a');
  });
});
