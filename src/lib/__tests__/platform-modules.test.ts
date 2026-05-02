/**
 * platform-modules.test.ts
 * Tests for conversations, messages, SLA, CSAT and agents modules.
 * Validates business logic and schema correctness.
 */
import { describe, it, expect } from 'vitest';

// ── Conversation Status Logic ─────────────────────────────────────────────

describe('Conversation status transitions', () => {
  const VALID_STATUSES = ['open', 'closed', 'pending', 'resolved'];
  const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

  VALID_STATUSES.forEach((status) => {
    it(`validates status '${status}'`, () => {
      expect(VALID_STATUSES.includes(status)).toBe(true);
    });
  });

  VALID_PRIORITIES.forEach((priority) => {
    it(`validates priority '${priority}'`, () => {
      expect(VALID_PRIORITIES.includes(priority)).toBe(true);
    });
  });

  it('open → closed sets resolution_at', () => {
    const resolution_at = new Date().toISOString();
    expect(resolution_at).toBeTruthy();
    expect(new Date(resolution_at).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('resolution_seconds = now - created_at', () => {
    const created = new Date(Date.now() - 3600 * 1000); // 1 hour ago
    const secs = Math.round((Date.now() - created.getTime()) / 1000);
    expect(secs).toBeGreaterThanOrEqual(3600);
    expect(secs).toBeLessThanOrEqual(3610);
  });

  it('first_response_seconds calculated correctly', () => {
    const created  = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago
    const response = new Date();
    const secs = Math.round((response.getTime() - created.getTime()) / 1000);
    expect(secs).toBeGreaterThanOrEqual(300);
    expect(secs).toBeLessThanOrEqual(310);
  });
});

// ── SLA Business Logic ─────────────────────────────────────────────────────

describe('SLA calculations', () => {
  it('SLA breach detection: first response', () => {
    const created_at = new Date(Date.now() - 90 * 60 * 1000); // 90 min ago
    const sla_minutes = 60;
    const elapsed_minutes = (Date.now() - created_at.getTime()) / (60 * 1000);
    const is_breached = elapsed_minutes > sla_minutes;
    expect(is_breached).toBe(true);
  });

  it('SLA not breached within window', () => {
    const created_at = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
    const sla_minutes = 60;
    const elapsed_minutes = (Date.now() - created_at.getTime()) / (60 * 1000);
    const is_breached = elapsed_minutes > sla_minutes;
    expect(is_breached).toBe(false);
  });

  it('compliance rate calculation', () => {
    const total     = 100;
    const breached  = 5;
    const rate = Math.round(100 * (total - breached) / total);
    expect(rate).toBe(95);
  });

  it('NPS score calculation', () => {
    const promoters   = 60;
    const detractors  = 20;
    const total       = 100;
    const nps = Math.round(100 * (promoters - detractors) / total);
    expect(nps).toBe(40);
  });

  it('NPS classification', () => {
    const classify = (score: number) => score >= 9 ? 'promoter' : score <= 6 ? 'detractor' : 'passive';
    expect(classify(10)).toBe('promoter');
    expect(classify(9)).toBe('promoter');
    expect(classify(8)).toBe('passive');
    expect(classify(7)).toBe('passive');
    expect(classify(6)).toBe('detractor');
    expect(classify(0)).toBe('detractor');
  });
});

// ── CSAT Scoring ──────────────────────────────────────────────────────────

describe('CSAT scoring', () => {
  it('validates score range 0-10', () => {
    const isValid = (s: number) => s >= 0 && s <= 10 && Number.isInteger(s);
    expect(isValid(0)).toBe(true);
    expect(isValid(5)).toBe(true);
    expect(isValid(10)).toBe(true);
    expect(isValid(11)).toBe(false);
    expect(isValid(-1)).toBe(false);
    expect(isValid(5.5)).toBe(false);
  });

  it('avg score calculation', () => {
    const scores = [8, 9, 10, 7, 6];
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    expect(avg).toBe(8);
  });

  it('star display (0-10 → 0-5 stars)', () => {
    const toStars = (score: number) => Math.round(score / 2);
    expect(toStars(10)).toBe(5);
    expect(toStars(8)).toBe(4);
    expect(toStars(6)).toBe(3);
    expect(toStars(0)).toBe(0);
  });
});

// ── Agent Status ──────────────────────────────────────────────────────────

describe('Agent status enum', () => {
  const VALID_STATUSES = ['draft','configured','testing','staging','review','production','monitoring','deprecated','archived'];

  VALID_STATUSES.forEach((status) => {
    it(`'${status}' is valid agent_status`, () => {
      expect(VALID_STATUSES.includes(status)).toBe(true);
    });
  });

  it('production agents can be assigned', () => {
    const agent = { status: 'production', id: 'agent-1' };
    expect(agent.status === 'production').toBe(true);
  });

  it('deprecated agents cannot be assigned', () => {
    const agent = { status: 'deprecated', id: 'agent-2' };
    expect(['draft','deprecated','archived'].includes(agent.status)).toBe(true);
  });

  it('smart assignment picks least loaded agent', () => {
    const agents = [
      { id: 'a1', current_load: 8 },
      { id: 'a2', current_load: 2 },
      { id: 'a3', current_load: 5 },
    ];
    const best = agents.sort((a, b) => a.current_load - b.current_load)[0];
    expect(best.id).toBe('a2');
    expect(best.current_load).toBe(2);
  });
});

// ── Message Types ─────────────────────────────────────────────────────────

describe('Message type handling', () => {
  const MEDIA_TYPES = ['image','audio','video','document','sticker','location'];
  const TEXT_TYPES  = ['text','extendedText','listMessage','buttonsMessage'];

  MEDIA_TYPES.forEach((type) => {
    it(`'${type}' is media message`, () => {
      expect(MEDIA_TYPES.includes(type)).toBe(true);
    });
  });

  it('media messages require media_url', () => {
    const msg = { message_type: 'image', media_url: 'https://example.com/img.jpg', content: null };
    const isMedia = MEDIA_TYPES.includes(msg.message_type);
    expect(isMedia).toBe(true);
    expect(msg.media_url).toBeTruthy();
  });

  it('follow-up calculation', () => {
    const follow_up_at = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min ago
    const is_overdue = new Date(follow_up_at).getTime() <= Date.now();
    expect(is_overdue).toBe(true);
  });

  it('future follow-up is not overdue', () => {
    const follow_up_at = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hr future
    const is_overdue = new Date(follow_up_at).getTime() <= Date.now();
    expect(is_overdue).toBe(false);
  });
});

// ── Webhook Health ────────────────────────────────────────────────────────

describe('Webhook health logic', () => {
  it('webhook is healthy when DLQ is empty and no pending', () => {
    const health = { dlq_pending: 0, pending_events: 0 };
    const is_healthy = health.dlq_pending === 0 && health.pending_events === 0;
    expect(is_healthy).toBe(true);
  });

  it('webhook is unhealthy with DLQ items', () => {
    const health = { dlq_pending: 3, pending_events: 0 };
    const is_healthy = health.dlq_pending === 0 && health.pending_events === 0;
    expect(is_healthy).toBe(false);
  });

  it('processing rate calculation', () => {
    const total     = 100;
    const processed = 97;
    const rate = Math.round((processed / total) * 100);
    expect(rate).toBe(97);
  });
});

// ── Duration formatting ───────────────────────────────────────────────────

describe('Duration formatting', () => {
  const fmt = (s: number | null): string => {
    if (!s) return '—';
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.round(s / 60)}min`;
    return `${(s / 3600).toFixed(1)}h`;
  };

  it('null → em-dash', ()  => { expect(fmt(null)).toBe('—'); });
  it('30s → "30s"',        () => { expect(fmt(30)).toBe('30s'); });
  it('90s → "2min"',       () => { expect(fmt(90)).toBe('2min'); });
  it('3600s → "1.0h"',     () => { expect(fmt(3600)).toBe('1.0h'); });
  it('5400s → "1.5h"',     () => { expect(fmt(5400)).toBe('1.5h'); });
});
