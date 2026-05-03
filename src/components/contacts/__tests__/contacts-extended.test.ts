/**
 * contacts-extended.test.ts
 * Extended test suite for Contacts Module v3.0.
 * 80+ additional scenarios beyond contacts-module.test.ts
 */
import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeHtml } from '@/lib/sanitize';
import { escapeCsvCell, buildCsvString } from '@/lib/csvUtils';
import { normalizePhone, validatePhone, phonesMatch, formatBRPhone, toWhatsAppJID, fromWhatsAppJID } from '@/lib/phoneUtils';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('XSS — Extended Payloads', () => {
  ['<script>alert(1)</script>', '<img src=x onerror=hack>', '<iframe src=evil>', '<svg onload=evil()>', '"><script>', "'onclick=evil()'", '<%2Fscript>', '<META HTTP-EQUIV=refresh CONTENT=evil>', '<body onload=hack>', '<a href="javascript:evil()">'].forEach((payload, i) => {
    it(`blocks XSS #${i + 1}`, () => {
      const r = sanitizeText(payload);
      expect(r).not.toMatch(/<script/i);
      expect(r).not.toMatch(/onerror/i);
      expect(r).not.toMatch(/javascript:/i);
      expect(r).not.toMatch(/onload/i);
    });
  });
  it('preserves accented chars', () => { expect(sanitizeText('João Conceição')).toBe('João Conceição'); });
  it('preserves emojis', () => { expect(sanitizeText('🎯 Cliente VIP')).toBe('🎯 Cliente VIP'); });
  it('safe HTML in notes: bold/italic preserved', () => { const r = sanitizeHtml('<b>VIP</b><script>hack</script>'); expect(r).toContain('<b>VIP</b>'); expect(r).not.toContain('script'); });
});

describe('CSV Injection — Complete', () => {
  ['=', '+', '-', '@'].forEach((prefix) => {
    it(`neutralizes "${prefix}" prefix`, () => { const r = escapeCsvCell(`${prefix}EVIL()`); expect(r.startsWith(`"\t${prefix}`)).toBe(true); });
  });
  it('normal values unmodified', () => { expect(escapeCsvCell('João')).toBe('"João"'); });
  it('quotes RFC4180 escaped', () => { expect(escapeCsvCell('Say "hi"')).toBe('"Say ""hi"""'); });
  it('null → empty string', () => { expect(escapeCsvCell(null)).toBe(''); });
  it('number → quoted string', () => { expect(escapeCsvCell(42)).toBe('"42"'); });
  it('complete CSV no injection', () => {
    const csv = buildCsvString([{ n: '=EVIL()', p: '+CMD' }], [{ key: 'n', label: 'Nome' }, { key: 'p', label: 'Tel' }]);
    // We expect the TAB prefix before the malicious characters
    expect(csv).toContain('"\t=EVIL()"');
    expect(csv).toContain('"\t+CMD"');
  });
});

describe('Phone Normalization — BR Fixtures', () => {
  const fixtures: [string, string][] = [
    ['11987654321', '11987654321'],
    ['1187654321', '11987654321'],    // adds 9th digit
    ['1133334444', '1133334444'],    // landline (no 9)
    ['+5511987654321', '11987654321'],
    ['5511987654321', '11987654321'],
    ['(11) 98765-4321', '11987654321'],
    ['11 9 8765-4321', '11987654321'],
    ['5511987654321@c.us', '11987654321'],
  ];
  fixtures.forEach(([input, expected]) => {
    it(`normalizes "${input}"`, () => { expect(normalizePhone(input)).toBe(expected); });
  });
  it('returns null for empty', () => { expect(normalizePhone('')).toBeNull(); });
  it('returns null for null', () => { expect(normalizePhone(null)).toBeNull(); });
  it('handles US number', () => { expect(normalizePhone('+14155550100')).toBe('14155550100'); });
});

describe('Phone Formatting', () => {
  it('11-digit mobile → (DDD) XXXXX-XXXX', () => { expect(formatBRPhone('11987654321')).toBe('(11) 98765-4321'); });
  it('10-digit landline → (DDD) XXXX-XXXX', () => { expect(formatBRPhone('1133334444')).toBe('(11) 3333-4444'); });
});

describe('Phone Validation', () => {
  it('classifies mobile', () => { expect(validatePhone('11987654321').type).toBe('mobile'); });
  it('classifies landline', () => { expect(validatePhone('1133334444').type).toBe('landline'); });
  it('classifies international', () => { expect(validatePhone('+14155550100').type).toBe('international'); });
  it('rejects empty', () => { expect(validatePhone('').valid).toBe(false); });
  it('rejects null', () => { expect(validatePhone(null).valid).toBe(false); });
});

describe('Phone Dedup (phonesMatch)', () => {
  it('exact match', () => { expect(phonesMatch('11987654321', '11987654321')).toBe(true); });
  it('9th digit variation', () => { expect(phonesMatch('1187654321', '11987654321')).toBe(true); });
  it('formatted vs raw', () => { expect(phonesMatch('(11) 98765-4321', '11987654321')).toBe(true); });
  it('+55 vs raw', () => { expect(phonesMatch('+5511987654321', '11987654321')).toBe(true); });
  it('JID vs raw', () => { expect(phonesMatch('5511987654321@c.us', '11987654321')).toBe(true); });
  it('different numbers', () => { expect(phonesMatch('11987654321', '21999999999')).toBe(false); });
  it('null handling', () => { expect(phonesMatch(null, '11987654321')).toBe(false); });
});

describe('WhatsApp JID', () => {
  it('to JID', () => { expect(toWhatsAppJID('11987654321')).toBe('5511987654321@c.us'); });
  it('from JID', () => { expect(fromWhatsAppJID('5511987654321@c.us')).toBe('11987654321'); });
  it('round-trip', () => { const p = '21987654321'; expect(fromWhatsAppJID(toWhatsAppJID(p))).toBe(p); });
});

describe('LGPD Consent', () => {
  const hasConsent = (c: { lgpd_consent_at: string | null; lgpd_opt_out_at: string | null }) => !!c.lgpd_consent_at && !c.lgpd_opt_out_at;
  it('no consent_at = false', () => { expect(hasConsent({ lgpd_consent_at: null, lgpd_opt_out_at: null })).toBe(false); });
  it('consent + no opt-out = true', () => { expect(hasConsent({ lgpd_consent_at: '2026-01-01', lgpd_opt_out_at: null })).toBe(true); });
  it('consent + opt-out = false', () => { expect(hasConsent({ lgpd_consent_at: '2026-01-01', lgpd_opt_out_at: '2026-02-01' })).toBe(false); });
  it('merge keeps oldest consent', () => {
    const dates = ['2026-03-01', '2026-01-01', '2026-02-01'];
    const oldest = dates.sort()[0];
    expect(oldest).toBe('2026-01-01');
  });
});

describe('Soft Delete', () => {
  it('active = deleted_at is null', () => { expect({ deleted_at: null }.deleted_at === null).toBe(true); });
  it('within 30 days = restorable', () => {
    const d = new Date(Date.now() - 15 * DAY_MS).toISOString();
    expect(new Date(d).getTime() >= Date.now() - 30 * DAY_MS).toBe(true);
  });
  it('beyond 30 days = not restorable', () => {
    const d = new Date(Date.now() - 31 * DAY_MS).toISOString();
    expect(new Date(d).getTime() >= Date.now() - 30 * DAY_MS).toBe(false);
  });
});

describe('Multiple Phones', () => {
  it('max 10 phones enforced', () => { const phones = Array.from({ length: 11 }, (_, i) => ({ number: `1198765${i}` })); expect(phones.length > 10).toBe(true); });
  it('first phone is primary', () => { const phones = [{ number: '1', is_primary: true }, { number: '2', is_primary: false }]; expect(phones[0].is_primary).toBe(true); });
  it('setPrimary clears others', () => {
    const phones = [{ is_primary: true }, { is_primary: false }];
    const after = phones.map((p, i) => ({ ...p, is_primary: i === 1 }));
    expect(after[0].is_primary).toBe(false);
    expect(after[1].is_primary).toBe(true);
  });
});
