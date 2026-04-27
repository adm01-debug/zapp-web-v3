import { describe, it, expect, beforeEach } from 'vitest';
import { reconcileOptimistic } from '@/hooks/useExternalEvolution';
import {
  getReconciliationStats,
  getRecentMatches,
  resetReconciliationStats,
} from '@/hooks/realtime/reconciliationTelemetry';
import type { RealtimeMessage } from '@/hooks/useRealtimeMessages';

const base: Omit<RealtimeMessage, 'id'> = {
  external_id: null,
  remote_jid: '5511@c',
  sender: 'me',
  content: '',
  message_type: 'text',
  status: 'sending',
  status_updated_at: null,
  media_url: null,
  created_at: new Date('2026-04-27T10:00:00Z').toISOString(),
} as unknown as Omit<RealtimeMessage, 'id'>;

const mk = (over: Partial<RealtimeMessage>): RealtimeMessage =>
  ({ ...base, ...over }) as RealtimeMessage;

describe('reconciliation telemetry', () => {
  beforeEach(() => resetReconciliationStats());

  it('counts external_id matches', () => {
    const opt = mk({ id: 'optimistic:1', external_id: 'wa-1', content: 'oi' });
    const can = mk({ id: 'real-1', external_id: 'wa-1', content: 'oi' });
    reconcileOptimistic([opt], [can]);

    const s = getReconciliationStats();
    expect(s.total).toBe(1);
    expect(s.byStrategy.external_id).toBe(1);
    expect(s.byMessageType.text).toBe(1);
    expect(s.byStrategyAndType.external_id.text).toBe(1);
  });

  it('counts text fallback matches', () => {
    const opt = mk({ id: 'optimistic:2', content: 'hello' });
    const can = mk({ id: 'real-2', content: 'hello' });
    reconcileOptimistic([opt], [can]);

    const s = getReconciliationStats();
    expect(s.byStrategy.text_fallback).toBe(1);
    const recent = getRecentMatches();
    expect(recent[0].strategy).toBe('text_fallback');
    expect(recent[0].deltaMs).toBe(0);
  });

  it('counts media fallback by message_type (audio/image)', () => {
    const audioOpt = mk({
      id: 'optimistic:a', message_type: 'audio', content: '[Áudio]', media_url: 'blob:x',
    });
    const audioCan = mk({ id: 'real-a', message_type: 'audio', content: '' });
    const imgOpt = mk({
      id: 'optimistic:i', message_type: 'image', content: '[Imagem]', media_url: 'blob:y',
    });
    const imgCan = mk({ id: 'real-i', message_type: 'image', content: '' });

    reconcileOptimistic([audioOpt, imgOpt], [audioCan, imgCan]);

    const s = getReconciliationStats();
    expect(s.byStrategy.media_fallback).toBe(2);
    expect(s.byStrategyAndType.media_fallback.audio).toBe(1);
    expect(s.byStrategyAndType.media_fallback.image).toBe(1);
  });

  it('does not record when no match', () => {
    const opt = mk({ id: 'optimistic:n', content: 'a' });
    const can = mk({ id: 'real-n', content: 'b' });
    reconcileOptimistic([opt], [can]);
    expect(getReconciliationStats().total).toBe(0);
  });
});
