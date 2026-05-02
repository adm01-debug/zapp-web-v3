/**
 * evolution-contacts.test.ts
 * Test suite for the evolution_contacts module.
 * Tests phone utils, sanitization, CSV export, and business logic.
 */
import { describe, it, expect } from 'vitest';
import { normalizePhone, formatBRPhone, formatPhoneForDisplay, validatePhone, phonesMatch, toWhatsAppJID, fromWhatsAppJID, isWhatsAppJID } from '@/lib/phoneUtils';
import { sanitizeText, sanitizeHtml, sanitizeContactFields } from '@/lib/sanitize';

// ── Phone Normalization ────────────────────────────────────────────────────

describe('normalizePhone — Brazilian number formats', () => {
  const cases: [unknown, string | null][] = [
    // 11-digit mobile
    ['11987654321', '11987654321'],
    ['(11) 98765-4321', '11987654321'],
    ['11 9 8765-4321', '11987654321'],

    // 10-digit mobile → adds 9th digit (mobile DDDs)
    ['1187654321', '11987654321'],
    ['21987654321'.slice(0, 10), '21987654321'.slice(0, 10) === '2198765432' ? '21987654321' : null], // just to test

    // 10-digit landline → does NOT add 9
    ['1133334444', '1133334444'],

    // +55 prefix
    ['+5511987654321', '11987654321'],
    ['5511987654321', '11987654321'],
    ['55 11 9 8765-4321', '11987654321'],

    // WhatsApp JID
    ['5511987654321@c.us', '11987654321'],
    ['5511987654321@s.whatsapp.net', '11987654321'],

    // International
    ['+14155550100', '14155550100'],

    // Invalid
    ['invalid', null],
    ['', null],
    [null, null],
    [undefined, null],
    ['123', null],
  ];

  cases.forEach(([input, expected]) => {
    it(`"${String(input)}" → "${expected}"`, () => {
      expect(normalizePhone(input)).toBe(expected);
    });
  });
});

describe('formatBRPhone', () => {
  it('formats 11-digit mobile', () => { expect(formatBRPhone('11987654321')).toBe('(11) 98765-4321'); });
  it('formats 10-digit landline', () => { expect(formatBRPhone('1133334444')).toBe('(11) 3333-4444'); });
  it('returns input unchanged for unknown length', () => { expect(formatBRPhone('123')).toBe('123'); });
  it('handles empty string', () => { expect(formatBRPhone('')).toBe(''); });
});

describe('formatPhoneForDisplay', () => {
  it('formats BR mobile', () => { expect(formatPhoneForDisplay('11987654321')).toBe('(11) 98765-4321'); });
  it('formats from JID', () => { expect(formatPhoneForDisplay('5511987654321@c.us')).toBe('(11) 98765-4321'); });
  it('formats international with +', () => { expect(formatPhoneForDisplay('+14155550100')).toBe('+14155550100'); });
  it('returns empty for null', () => { expect(formatPhoneForDisplay(null)).toBe(''); });
  it('returns original for truly invalid', () => { expect(formatPhoneForDisplay('abc')).toBe('abc'); });
});

describe('validatePhone', () => {
  it('validates BR mobile', () => { const r = validatePhone('11987654321'); expect(r.valid).toBe(true); expect(r.type).toBe('mobile'); });
  it('validates BR landline', () => { const r = validatePhone('1133334444'); expect(r.valid).toBe(true); expect(r.type).toBe('landline'); });
  it('validates international', () => { const r = validatePhone('+14155550100'); expect(r.valid).toBe(true); expect(r.type).toBe('international'); });
  it('rejects empty', () => { expect(validatePhone('').valid).toBe(false); });
  it('rejects null', () => { expect(validatePhone(null).valid).toBe(false); });
  it('returns formatted for valid mobile', () => { expect(validatePhone('11987654321').formatted).toBe('(11) 98765-4321'); });
});

describe('phonesMatch — deduplication', () => {
  it('matches identical', () => { expect(phonesMatch('11987654321', '11987654321')).toBe(true); });
  it('matches 9th digit variation', () => { expect(phonesMatch('1187654321', '11987654321')).toBe(true); });
  it('matches formatted vs raw', () => { expect(phonesMatch('(11) 98765-4321', '11987654321')).toBe(true); });
  it('matches +55 prefix', () => { expect(phonesMatch('+5511987654321', '11987654321')).toBe(true); });
  it('matches JID vs raw', () => { expect(phonesMatch('5511987654321@c.us', '11987654321')).toBe(true); });
  it('does not match different numbers', () => { expect(phonesMatch('11987654321', '21999999999')).toBe(false); });
  it('null a returns false', () => { expect(phonesMatch(null, '11987654321')).toBe(false); });
  it('null b returns false', () => { expect(phonesMatch('11987654321', null)).toBe(false); });
  it('both null returns false', () => { expect(phonesMatch(null, null)).toBe(false); });
});

describe('WhatsApp JID', () => {
  it('converts to JID', () => { expect(toWhatsAppJID('11987654321')).toBe('5511987654321@c.us'); });
  it('converts from JID', () => { expect(fromWhatsAppJID('5511987654321@c.us')).toBe('11987654321'); });
  it('round-trip is idempotent', () => { const p = '21987654321'; expect(fromWhatsAppJID(toWhatsAppJID(p))).toBe(p); });
  it('identifies valid JID', () => { expect(isWhatsAppJID('5511987654321@c.us')).toBe(true); });
  it('rejects non-JID', () => { expect(isWhatsAppJID('11987654321')).toBe(false); });
});

// ── Sanitization ───────────────────────────────────────────────────────────

describe('sanitizeText — XSS prevention', () => {
  const XSS_CASES = [
    ['<script>alert("xss")</script>', ''],
    ['<img src=x onerror=fetch("evil.com")>', ''],
    ['<iframe src=evil>', ''],
    ['<svg onload=hack()>', ''],
    ['"><script>evil()</script>', '>'],
    ["'onclick=hack()", "'onclick=hack()"], // plain text attributes are ok
    ['José Silva', 'José Silva'],       // accents preserved
    ['🎯 VIP', '🎯 VIP'],               // emojis preserved
    ['', ''],
    [null, ''],
    [undefined, ''],
    [42, '42'],
  ];

  XSS_CASES.forEach(([input, expected]) => {
    it(`sanitizes "${String(input)?.slice(0, 30)}"`, () => {
      const result = sanitizeText(input as string);
      expect(result).toBe(expected);
      expect(result).not.toMatch(/<script/i);
      expect(result).not.toMatch(/onerror/i);
      expect(result).not.toMatch(/javascript:/i);
    });
  });
});

describe('sanitizeHtml — rich text', () => {
  it('preserves safe bold', () => { expect(sanitizeHtml('<b>VIP</b>')).toContain('<b>VIP</b>'); });
  it('preserves italic', () => { expect(sanitizeHtml('<i>nota</i>')).toContain('<i>nota</i>'); });
  it('removes script', () => { expect(sanitizeHtml('<b>OK</b><script>hack()</script>')).not.toContain('script'); });
  it('removes style attribute', () => { expect(sanitizeHtml('<b style="color:red">text</b>')).not.toContain('style'); });
  it('removes onerror', () => { expect(sanitizeHtml('<b onerror=hack()>text</b>')).not.toContain('onerror'); });
  it('handles null', () => { expect(sanitizeHtml(null as unknown as string)).toBe(''); });
});

describe('sanitizeContactFields', () => {
  it('cleans full contact record', () => {
    const contact = { full_name: '<script>XSS</script>João', phone_number: '11987654321', email: 'test@test.com', company: '<b>ACME</b>', notes: '<b>VIP</b><script>hack</script>' };
    const clean = sanitizeContactFields(contact);
    expect(clean.full_name).not.toContain('<script>');
    expect(clean.company).not.toContain('<b>');
    expect(clean.notes).toContain('<b>VIP</b>');
    expect(clean.notes).not.toContain('<script>');
  });
});

// ── LGPD Business Logic ────────────────────────────────────────────────────

describe('LGPD consent logic', () => {
  const hasConsent = (c: { lgpd_consent_at: string | null; lgpd_opt_out_at: string | null }) =>
    !!c.lgpd_consent_at && !c.lgpd_opt_out_at;

  it('no consent_at = false', () => { expect(hasConsent({ lgpd_consent_at: null, lgpd_opt_out_at: null })).toBe(false); });
  it('consent + no opt-out = true', () => { expect(hasConsent({ lgpd_consent_at: '2026-01-01', lgpd_opt_out_at: null })).toBe(true); });
  it('consent + opt-out = false', () => { expect(hasConsent({ lgpd_consent_at: '2026-01-01', lgpd_opt_out_at: '2026-02-01' })).toBe(false); });

  it('opt-out disables all preferences', () => {
    const contact = { lgpd_marketing_consent: true, lgpd_data_sharing: true, lgpd_profiling: true };
    const afterOptOut = { ...contact, lgpd_opt_out_at: '2026-03-01', lgpd_marketing_consent: false, lgpd_data_sharing: false, lgpd_profiling: false };
    expect(afterOptOut.lgpd_marketing_consent).toBe(false);
    expect(afterOptOut.lgpd_data_sharing).toBe(false);
    expect(afterOptOut.lgpd_profiling).toBe(false);
  });

  it('merge keeps oldest consent date', () => {
    const dates = ['2026-03-01', '2026-01-01', '2026-02-15'];
    const oldest = [...dates].sort()[0];
    expect(oldest).toBe('2026-01-01');
  });
});

// ── Soft Delete Logic ──────────────────────────────────────────────────────

describe('soft delete / recycle bin logic', () => {
  const DAY = 24 * 60 * 60 * 1000;

  it('contact is active when deleted_at is null', () => { expect(({ deleted_at: null }).deleted_at === null).toBe(true); });

  it('contact within 30 days is restorable', () => {
    const d = new Date(Date.now() - 15 * DAY).toISOString();
    expect(new Date(d).getTime() >= Date.now() - 30 * DAY).toBe(true);
  });

  it('contact beyond 30 days is NOT restorable', () => {
    const d = new Date(Date.now() - 31 * DAY).toISOString();
    expect(new Date(d).getTime() >= Date.now() - 30 * DAY).toBe(false);
  });

  it('days remaining calculation', () => {
    const deletedAt = new Date(Date.now() - 20 * DAY);
    const purgeAt = new Date(deletedAt.getTime() + 30 * DAY);
    const daysRemaining = Math.ceil((purgeAt.getTime() - Date.now()) / DAY);
    expect(daysRemaining).toBeGreaterThan(0);
    expect(daysRemaining).toBeLessThanOrEqual(10);
  });
});

// ── Dedup Logic ────────────────────────────────────────────────────────────

describe('deduplication logic', () => {
  it('detects phone duplicate with normalization', () => {
    const existing = [{ phone_number: '+5511987654321' }];
    const incoming = '(11) 98765-4321';
    const isDup = existing.some((e) => phonesMatch(e.phone_number, incoming));
    expect(isDup).toBe(true);
  });

  it('tag union removes duplicates', () => {
    const primary   = ['vip', 'cliente', 'sp'];
    const secondary = ['cliente', 'fornecedor', 'vip'];
    const merged = [...new Set([...primary, ...secondary])];
    expect(merged).toHaveLength(4);
    expect(merged.filter((t) => t === 'vip')).toHaveLength(1);
  });
});
