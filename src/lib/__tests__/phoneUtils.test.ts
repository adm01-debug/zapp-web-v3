/**
 * phoneUtils.test.ts — v2.0
 * 60+ tests for phoneUtils.ts v2.0
 */
import { describe, it, expect } from 'vitest';
import {
  normalizePhone, validatePhone, formatPhoneForDisplay,
  toWhatsAppJID, fromWhatsAppJID, phonesMatch, phoneVariants,
  normalizePhoneList, VALID_DDDS,
} from '@/lib/phoneUtils';

describe('VALID_DDDS', () => {
  it('has SP (11)', () => expect(VALID_DDDS.has(11)).toBe(true));
  it('has BSB (61)', () => expect(VALID_DDDS.has(61)).toBe(true));
  it('has POA (51)', () => expect(VALID_DDDS.has(51)).toBe(true));
  it('has RJ (21)', () => expect(VALID_DDDS.has(21)).toBe(true));
  it('has BH (31)', () => expect(VALID_DDDS.has(31)).toBe(true));
  it('rejects 10', () => expect(VALID_DDDS.has(10)).toBe(false));
  it('rejects 20', () => expect(VALID_DDDS.has(20)).toBe(false));
  it('has 67+ entries', () => expect(VALID_DDDS.size).toBeGreaterThanOrEqual(67));
});

describe('normalizePhone', () => {
  it('11-digit mobile unchanged', () => expect(normalizePhone('11987654321')).toBe('11987654321'));
  it('strips spaces', () => expect(normalizePhone('11 98765 4321')).toBe('11987654321'));
  it('strips dashes', () => expect(normalizePhone('11-98765-4321')).toBe('11987654321'));
  it('strips parens', () => expect(normalizePhone('(11) 98765-4321')).toBe('11987654321'));
  it('strips +55', () => expect(normalizePhone('+5511987654321')).toBe('11987654321'));
  it('strips 55 prefix (13 digits)', () => expect(normalizePhone('5511987654321')).toBe('11987654321'));
  it('adds 9th digit for 8XXXXXXX DDD 11', () => expect(normalizePhone('1187654321')).toBe('11987654321'));
  it('adds 9th digit for 6XXXXXXX DDD 62', () => expect(normalizePhone('6299999999')).toBe('62999999999'));
  it('adds 9th digit for 7XXXXXXX DDD 71', () => expect(normalizePhone('7178889999')).toBe('71978889999'));
  it('keeps 10-digit landline (3)', () => expect(normalizePhone('1133334444')).toBe('1133334444'));
  it('keeps 10-digit landline (4)', () => expect(normalizePhone('1143334444')).toBe('1143334444'));
  it('null → null', () => expect(normalizePhone(null)).toBeNull());
  it('empty → null', () => expect(normalizePhone('')).toBeNull());
  it('invalid DDD (10) → null', () => expect(normalizePhone('1087654321')).toBeNull());
  it('too short (9 digits) → null', () => expect(normalizePhone('11987654')).toBeNull());
  it('too long (12 digits) → null', () => expect(normalizePhone('119876543219')).toBeNull());
});

describe('validatePhone', () => {
  it('valid mobile → true', () => expect(validatePhone('11987654321')).toBe(true));
  it('valid landline → true', () => expect(validatePhone('1133334444')).toBe(true));
  it('invalid DDD → false', () => expect(validatePhone('1087654321')).toBe(false));
  it('empty → false', () => expect(validatePhone('')).toBe(false));
  it('null → false', () => expect(validatePhone(null)).toBe(false));
});

describe('formatPhoneForDisplay', () => {
  it('mobile: (11) 98765-4321', () => expect(formatPhoneForDisplay('11987654321')).toBe('(11) 98765-4321'));
  it('landline: (11) 3333-4444', () => expect(formatPhoneForDisplay('1133334444')).toBe('(11) 3333-4444'));
  it('accepts formatted input', () => expect(formatPhoneForDisplay('(11) 98765-4321')).toBe('(11) 98765-4321'));
  it('empty → empty', () => expect(formatPhoneForDisplay('')).toBe(''));
  it('null → empty', () => expect(formatPhoneForDisplay(null)).toBe(''));
});

describe('toWhatsAppJID', () => {
  it('converts to JID', () => expect(toWhatsAppJID('11987654321')).toBe('5511987654321@c.us'));
  it('null → null', () => expect(toWhatsAppJID('')).toBeNull());
  it('handles +55 input', () => expect(toWhatsAppJID('+5511987654321')).toBe('5511987654321@c.us'));
});

describe('fromWhatsAppJID', () => {
  it('extracts from @c.us', () => expect(fromWhatsAppJID('5511987654321@c.us')).toBe('11987654321'));
  it('extracts from @s.whatsapp.net', () => expect(fromWhatsAppJID('5511987654321@s.whatsapp.net')).toBe('11987654321'));
  it('null → null', () => expect(fromWhatsAppJID('')).toBeNull());
  it('invalid → null', () => expect(fromWhatsAppJID('invalid')).toBeNull());
});

describe('phonesMatch', () => {
  it('same number → true', () => expect(phonesMatch('11987654321','11987654321')).toBe(true));
  it('with/without 9th digit → true', () => expect(phonesMatch('11987654321','1187654321')).toBe(true));
  it('different → false', () => expect(phonesMatch('11987654321','11987654322')).toBe(false));
  it('null/empty → false', () => expect(phonesMatch(null,'11987654321')).toBe(false));
});

describe('phoneVariants', () => {
  it('11-digit returns both', () => {
    const v = phoneVariants('11987654321');
    expect(v).toContain('11987654321');
    expect(v).toContain('1187654321');
  });
  it('empty → []', () => expect(phoneVariants('')).toEqual([]));
});

describe('normalizePhoneList', () => {
  it('deduplicates same number in different formats', () => {
    const list = normalizePhoneList(['11987654321','(11) 98765-4321','+5511987654321']);
    expect(list).toHaveLength(1);
    expect(list[0]).toBe('11987654321');
  });
  it('filters invalid numbers', () => {
    const list = normalizePhoneList(['11987654321','invalid','',null]);
    expect(list).toHaveLength(1);
  });
});
