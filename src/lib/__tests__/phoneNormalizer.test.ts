import { describe, it, expect } from 'vitest';
import {
  normalizeBrazilianPhone,
  phoneToJid,
  formatPhoneDisplay,
} from '../phoneNormalizer';

describe('phoneNormalizer', () => {
  describe('normalizeBrazilianPhone', () => {
    it('normalizes full format with country code', () => {
      expect(normalizeBrazilianPhone('+55 11 999999999')).toBe('5511999999999');
      expect(normalizeBrazilianPhone('5511999999999')).toBe('5511999999999');
    });

    it('adds 9th digit when missing (SP mobile)', () => {
      expect(normalizeBrazilianPhone('551199999999')).toBe('5511999999999');
      expect(normalizeBrazilianPhone('1199999999')).toBe('5511999999999');
    });

    it('does NOT add 9th digit to landlines', () => {
      expect(normalizeBrazilianPhone('551133334444')).toBe('551133334444');
      expect(normalizeBrazilianPhone('1133334444')).toBe('551133334444');
    });

    it('handles DDD + 9-digit mobile', () => {
      expect(normalizeBrazilianPhone('11999999999')).toBe('5511999999999');
      expect(normalizeBrazilianPhone('21987654321')).toBe('5521987654321');
    });

    it('strips formatting characters', () => {
      expect(normalizeBrazilianPhone('+55 (11) 9 9999-9999')).toBe('5511999999999');
      expect(normalizeBrazilianPhone('(21) 98765-4321')).toBe('5521987654321');
    });

    it('returns null for numbers without DDD', () => {
      expect(normalizeBrazilianPhone('99999999')).toBeNull();
      expect(normalizeBrazilianPhone('999999999')).toBeNull();
    });

    it('returns as-is for non-Brazilian international numbers', () => {
      expect(normalizeBrazilianPhone('+1 555 1234567')).toBe('15551234567');
    });

    it('returns null for invalid input', () => {
      expect(normalizeBrazilianPhone('')).toBeNull();
      expect(normalizeBrazilianPhone('abc')).toBeNull();
      expect(normalizeBrazilianPhone('123')).toBeNull();
    });
  });

  describe('phoneToJid', () => {
    it('creates valid WhatsApp JID', () => {
      expect(phoneToJid('11999999999')).toBe('5511999999999@s.whatsapp.net');
    });

    it('returns null for invalid phone', () => {
      expect(phoneToJid('')).toBeNull();
    });
  });

  describe('formatPhoneDisplay', () => {
    it('formats 13-digit number', () => {
      expect(formatPhoneDisplay('5511999999999')).toBe('+55 (11) 99999-9999');
    });

    it('formats 12-digit landline', () => {
      expect(formatPhoneDisplay('551133334444')).toBe('+55 (11) 3333-4444');
    });
  });
});
