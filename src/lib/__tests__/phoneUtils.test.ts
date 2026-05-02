/**
 * phoneUtils.test.ts — Complete test suite for phone normalization
 * Tests all Brazilian phone edge cases identified in the audit.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizePhone, formatBRPhone, formatPhoneForDisplay,
  validatePhone, toWhatsAppJID, fromWhatsAppJID, phonesMatch,
} from '../phoneUtils';

describe('normalizePhone', () => {
  // ── Standard BR formats ────────────────────────────────────────────────

  it('handles 11-digit mobile (already normalized)', () => {
    expect(normalizePhone('11987654321')).toBe('11987654321');
  });

  it('adds 9th digit to 10-digit mobile', () => {
    expect(normalizePhone('1187654321')).toBe('11987654321');
  });

  it('does NOT add 9th digit to landline', () => {
    expect(normalizePhone('1133334444')).toBe('1133334444');
  });

  it('strips +55 country code', () => {
    expect(normalizePhone('+5511987654321')).toBe('11987654321');
  });

  it('strips 55 country code without +', () => {
    expect(normalizePhone('5511987654321')).toBe('11987654321');
  });

  it('handles (DDD) XXXXX-XXXX format', () => {
    expect(normalizePhone('(11) 98765-4321')).toBe('11987654321');
  });

  it('handles (DDD) XXXX-XXXX landline format', () => {
    expect(normalizePhone('(11) 3333-4444')).toBe('1133334444');
  });

  it('handles +55 (11) 9 8765-4321 with spaces', () => {
    expect(normalizePhone('+55 (11) 9 8765-4321')).toBe('11987654321');
  });

  it('strips WhatsApp @c.us suffix', () => {
    expect(normalizePhone('5511987654321@c.us')).toBe('11987654321');
  });

  it('strips @s.whatsapp.net suffix', () => {
    expect(normalizePhone('5511987654321@s.whatsapp.net')).toBe('11987654321');
  });

  it('handles group JID @g.us', () => {
    // Group JIDs should return digits
    const result = normalizePhone('5511987654321@g.us');
    expect(result).toBeTruthy();
  });

  // ── Valid DDDs ─────────────────────────────────────────────────────────

  it('accepts DDD 11 (SP capital)', () => {
    expect(normalizePhone('11987654321')).toBe('11987654321');
  });

  it('accepts DDD 21 (RJ)', () => {
    expect(normalizePhone('21987654321')).toBe('21987654321');
  });

  it('accepts DDD 85 (CE)', () => {
    expect(normalizePhone('85987654321')).toBe('85987654321');
  });

  it('accepts DDD 91 (PA)', () => {
    expect(normalizePhone('91987654321')).toBe('91987654321');
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  it('returns null for null input', () => {
    expect(normalizePhone(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizePhone('')).toBeNull();
  });

  it('returns null for non-phone text', () => {
    expect(normalizePhone('abc def')).toBeNull();
  });

  it('returns null for too-short number', () => {
    expect(normalizePhone('12345')).toBeNull();
  });

  it('handles international number (+1 415-555-0100)', () => {
    const result = normalizePhone('+14155550100');
    expect(result).toBe('14155550100');
  });

  it('handles UK number (+44 20 1234 5678)', () => {
    const result = normalizePhone('+442012345678');
    expect(result).toBe('442012345678');
  });
});

describe('formatBRPhone', () => {
  it('formats 11-digit mobile', () => {
    expect(formatBRPhone('11987654321')).toBe('(11) 98765-4321');
  });

  it('formats 10-digit landline', () => {
    expect(formatBRPhone('1133334444')).toBe('(11) 3333-4444');
  });

  it('returns input unchanged for short numbers', () => {
    expect(formatBRPhone('1234')).toBe('1234');
  });
});

describe('formatPhoneForDisplay', () => {
  it('formats BR mobile number nicely', () => {
    expect(formatPhoneForDisplay('11987654321')).toBe('(11) 98765-4321');
  });

  it('adds + to international number', () => {
    expect(formatPhoneForDisplay('+14155550100')).toBe('+14155550100');
  });

  it('returns empty string for null', () => {
    expect(formatPhoneForDisplay(null)).toBe('');
  });

  it('returns raw value for invalid number', () => {
    const raw = 'invalid-phone';
    const result = formatPhoneForDisplay(raw);
    expect(result).toBe(raw);
  });
});

describe('validatePhone', () => {
  it('classifies 11-digit as mobile', () => {
    const result = validatePhone('11987654321');
    expect(result.valid).toBe(true);
    expect(result.type).toBe('mobile');
  });

  it('classifies 10-digit as landline', () => {
    const result = validatePhone('1133334444');
    expect(result.valid).toBe(true);
    expect(result.type).toBe('landline');
  });

  it('classifies +1 as international', () => {
    const result = validatePhone('+14155550100');
    expect(result.valid).toBe(true);
    expect(result.type).toBe('international');
  });

  it('rejects empty string', () => {
    const result = validatePhone('');
    expect(result.valid).toBe(false);
    expect(result.type).toBe('invalid');
  });

  it('provides formatted value', () => {
    const result = validatePhone('11987654321');
    expect(result.formatted).toBe('(11) 98765-4321');
  });
});

describe('toWhatsAppJID / fromWhatsAppJID', () => {
  it('converts normalized phone to JID', () => {
    expect(toWhatsAppJID('11987654321')).toBe('5511987654321@c.us');
  });

  it('extracts phone from JID', () => {
    expect(fromWhatsAppJID('5511987654321@c.us')).toBe('11987654321');
  });

  it('round-trips phone through JID', () => {
    const original = '21999887766';
    const jid = toWhatsAppJID(original);
    const recovered = fromWhatsAppJID(jid);
    expect(recovered).toBe(original);
  });
});

describe('phonesMatch (deduplication)', () => {
  it('exact match', () => {
    expect(phonesMatch('11987654321', '11987654321')).toBe(true);
  });

  it('same number different format (with DDI)', () => {
    expect(phonesMatch('+5511987654321', '11987654321')).toBe(true);
  });

  it('same number different format (spaces/dashes)', () => {
    expect(phonesMatch('(11) 98765-4321', '11987654321')).toBe(true);
  });

  it('10-digit and 11-digit same number match (9th digit)', () => {
    expect(phonesMatch('1187654321', '11987654321')).toBe(true);
  });

  it('different numbers do NOT match', () => {
    expect(phonesMatch('11987654321', '11988888888')).toBe(false);
  });

  it('null vs number does NOT match', () => {
    expect(phonesMatch(null, '11987654321')).toBe(false);
  });

  it('WhatsApp JID vs normalized phone match', () => {
    expect(phonesMatch('5511987654321@c.us', '11987654321')).toBe(true);
  });
});
