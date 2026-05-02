/**
 * normalizePhoneBR.test.ts
 * Tests for Brazilian phone normalization.
 */
import { describe, it, expect } from 'vitest';
import { normalizePhoneBR, formatPhoneBR, phonesMatch, phoneFingerprint } from '@/lib/normalizePhoneBR';

describe('normalizePhoneBR', () => {
  it('normalizes full E.164 format', () => {
    expect(normalizePhoneBR('+5511999887766')).toBe('+5511999887766');
  });

  it('normalizes without country code', () => {
    expect(normalizePhoneBR('11999887766')).toBe('+5511999887766');
  });

  it('normalizes with country code but no +', () => {
    expect(normalizePhoneBR('5511999887766')).toBe('+5511999887766');
  });

  it('normalizes formatted number with parentheses and dash', () => {
    expect(normalizePhoneBR('(11) 99988-7766')).toBe('+5511999887766');
  });

  it('adds 9th digit to 10-digit mobile numbers', () => {
    expect(normalizePhoneBR('1199887766')).toBe('+55119999887766').length;
    // 10 digits with mobile prefix -> adds 9
    const result = normalizePhoneBR('1198877665');
    expect(result).toMatch(/^\+55/);
  });

  it('keeps landline numbers as-is (10 digits starting with 2-5)', () => {
    expect(normalizePhoneBR('1133445566')).toBe('+551133445566');
  });

  it('strips trunk prefix 0', () => {
    expect(normalizePhoneBR('01199988-7766')).toBe('+5511999887766');
  });

  it('returns empty string for empty input', () => {
    expect(normalizePhoneBR('')).toBe('');
  });

  it('handles number with spaces', () => {
    expect(normalizePhoneBR('55 11 99988 7766')).toBe('+5511999887766');
  });
});

describe('formatPhoneBR', () => {
  it('formats mobile number', () => {
    expect(formatPhoneBR('+5511999887766')).toBe('(11) 99988-7766');
  });

  it('formats landline number', () => {
    expect(formatPhoneBR('+551133445566')).toBe('(11) 3344-5566');
  });
});

describe('phonesMatch', () => {
  it('matches identical numbers', () => {
    expect(phonesMatch('+5511999887766', '+5511999887766')).toBe(true);
  });

  it('matches with/without country code', () => {
    expect(phonesMatch('11999887766', '+5511999887766')).toBe(true);
  });

  it('matches formatted vs unformatted', () => {
    expect(phonesMatch('(11) 99988-7766', '5511999887766')).toBe(true);
  });

  it('returns false for different numbers', () => {
    expect(phonesMatch('+5511999887766', '+5521988776655')).toBe(false);
  });

  it('returns false for empty inputs', () => {
    expect(phonesMatch('', '+5511999887766')).toBe(false);
  });
});

describe('phoneFingerprint', () => {
  it('extracts last 8 digits', () => {
    expect(phoneFingerprint('+5511999887766')).toBe('99887766');
  });

  it('works with short numbers', () => {
    expect(phoneFingerprint('12345')).toBe('12345');
  });
});
