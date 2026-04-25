/**
 * inboxDedupeKeys — testes unitários.
 *
 * Cobre as garantias críticas:
 *   1. Mesmo instante em formatos ISO diferentes → MESMA chave.
 *   2. JIDs com `:` ou caracteres exóticos não colidem.
 *   3. Schema versionado evita reaproveitar cache antigo.
 *   4. Cursores nulos/inválidos têm representação estável (não lançam).
 */
import { describe, it, expect } from 'vitest';
import {
  inboxInitialKey,
  inboxPollKey,
  inboxOlderKey,
  inboxSidebarKey,
  inboxJidKeyPrefixes,
  normalizeCursorMs,
  INBOX_DEDUPE_SCHEMA_VERSION,
} from '@/lib/inbox/inboxDedupeKeys';

describe('inboxDedupeKeys — normalizeCursorMs', () => {
  it('normaliza variações ISO do MESMO instante para o mesmo epoch ms', () => {
    const variants = [
      '2026-04-25T22:00:00Z',
      '2026-04-25T22:00:00.000Z',
      '2026-04-25T22:00:00+00:00',
      '2026-04-25T22:00:00.000+00:00',
      '2026-04-25T19:00:00-03:00', // mesmo instante, TZ diferente
    ];
    const normalized = variants.map(normalizeCursorMs);
    expect(new Set(normalized).size).toBe(1);
    expect(normalized[0]).toBe(String(Date.UTC(2026, 3, 25, 22, 0, 0)));
  });

  it('aceita Date instance', () => {
    const d = new Date('2026-04-25T22:00:00.000Z');
    expect(normalizeCursorMs(d)).toBe(String(d.getTime()));
  });

  it('aceita epoch ms numérico', () => {
    expect(normalizeCursorMs(1777291200000)).toBe('1777291200000');
    expect(normalizeCursorMs('1777291200000')).toBe('1777291200000');
  });

  it('null/undefined/"" → "none" (estável)', () => {
    expect(normalizeCursorMs(null)).toBe('none');
    expect(normalizeCursorMs(undefined)).toBe('none');
    expect(normalizeCursorMs('')).toBe('none');
  });

  it('input inválido → "invalid" (não lança)', () => {
    expect(normalizeCursorMs('not-a-date')).toBe('invalid');
    expect(normalizeCursorMs(NaN)).toBe('invalid');
  });
});

describe('inboxDedupeKeys — builders', () => {
  const jid = '5511999990001@s.whatsapp.net';

  it('inboxInitialKey é estável para mesmo input', () => {
    const k1 = inboxInitialKey({ jid, pageSize: 100 });
    const k2 = inboxInitialKey({ jid, pageSize: 100 });
    expect(k1).toBe(k2);
    expect(k1).toMatch(/^inbox:v\d+:initial:/);
  });

  it('inboxPollKey COLAPSA variações ISO do afterDate', () => {
    const isoZ = '2026-04-25T22:00:00.000Z';
    const isoTz = '2026-04-25T22:00:00+00:00';
    const k1 = inboxPollKey({ jid, afterDate: isoZ });
    const k2 = inboxPollKey({ jid, afterDate: isoTz });
    expect(k1).toBe(k2); // ← garantia central: mudança de formato NÃO quebra dedupe
  });

  it('inboxOlderKey COLAPSA variações ISO do beforeDate', () => {
    const k1 = inboxOlderKey({
      jid,
      beforeDate: '2026-04-25T22:00:00.000Z',
      pageSize: 100,
    });
    const k2 = inboxOlderKey({
      jid,
      beforeDate: '2026-04-25T22:00:00+00:00',
      pageSize: 100,
    });
    expect(k1).toBe(k2);
  });

  it('JID com caracteres exóticos (@ : .) não colide com outros segmentos', () => {
    const groupJid = '120363:abc@g.us'; // grupo com `:` no ID
    const userJid = '120363@g.us';
    const k1 = inboxInitialKey({ jid: groupJid, pageSize: 100 });
    const k2 = inboxInitialKey({ jid: userJid, pageSize: 100 });
    expect(k1).not.toBe(k2);
    // Garante que o `:` do JID está escapado, não tratado como separador.
    expect(k1).not.toContain('120363:abc'); // crú
    expect(k1).toContain(encodeURIComponent(groupJid));
  });

  it('jids diferentes geram chaves diferentes', () => {
    expect(inboxInitialKey({ jid: 'a@x', pageSize: 100 })).not.toBe(
      inboxInitialKey({ jid: 'b@x', pageSize: 100 }),
    );
  });

  it('pageSize diferente gera chaves diferentes', () => {
    expect(inboxInitialKey({ jid, pageSize: 50 })).not.toBe(
      inboxInitialKey({ jid, pageSize: 100 }),
    );
  });

  it('schema version está embutido no início — bump invalidaria cache antigo', () => {
    const k = inboxInitialKey({ jid, pageSize: 100 });
    expect(k).toContain(`:${INBOX_DEDUPE_SCHEMA_VERSION}:`);
  });

  it('inboxSidebarKey é estável e independente de JID', () => {
    expect(inboxSidebarKey(7, 200)).toBe(inboxSidebarKey(7, 200));
    expect(inboxSidebarKey(7, 200)).not.toBe(inboxSidebarKey(7, 100));
  });

  it('inboxJidKeyPrefixes cobre as 3 chaves do JID e casa com elas', () => {
    const [initialP, pollP, olderP] = inboxJidKeyPrefixes(jid);
    expect(inboxInitialKey({ jid, pageSize: 100 }).startsWith(initialP)).toBe(true);
    expect(inboxPollKey({ jid, afterDate: '2026-04-25T22:00:00Z' }).startsWith(pollP)).toBe(true);
    expect(
      inboxOlderKey({ jid, beforeDate: '2026-04-25T22:00:00Z', pageSize: 100 }).startsWith(olderP),
    ).toBe(true);
  });

  it('cursor null vs cursor válido → chaves distintas e estáveis', () => {
    const kNull = inboxPollKey({ jid, afterDate: null });
    const kVal = inboxPollKey({ jid, afterDate: '2026-04-25T22:00:00Z' });
    expect(kNull).not.toBe(kVal);
    // Repetível: null sempre vira a MESMA chave.
    expect(kNull).toBe(inboxPollKey({ jid, afterDate: null }));
    expect(kNull).toBe(inboxPollKey({ jid, afterDate: undefined }));
  });
});
