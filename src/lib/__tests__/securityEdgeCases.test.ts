import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeUrl,
  sanitizeJid,
  sanitizeDisplayName,
  sanitizePhone,
  createRateLimiter,
} from '../security';

/**
 * Edge-case tests for security utilities.
 * Covers unicode attacks, prototype pollution attempts,
 * and real-world Brazilian input variations.
 */
describe('security edge cases', () => {
  describe('escapeHtml - advanced attacks', () => {
    it('blocks event handler injection', () => {
      const result = escapeHtml('<img src=x onerror=alert(1)>');
      expect(result).not.toContain('<img');
    });

    it('blocks SVG script injection', () => {
      const result = escapeHtml('<svg onload=alert(1)>');
      expect(result).not.toContain('<svg');
    });

    it('handles nested encoding attempts', () => {
      const result = escapeHtml('&lt;script&gt;');
      expect(result).toContain('&amp;lt;');
    });
  });

  describe('sanitizeUrl - edge cases', () => {
    it('blocks mixed-case javascript', () => {
      expect(sanitizeUrl('jAvAsCrIpT:alert(1)')).toBe('#');
    });

    it('blocks URL with leading whitespace', () => {
      expect(sanitizeUrl('  javascript:alert(1)')).toBe('#');
    });

    it('handles empty string', () => {
      expect(sanitizeUrl('')).toBe('#');
    });

    it('handles whatsapp deep links', () => {
      expect(sanitizeUrl('whatsapp://send?text=hello')).toBe('whatsapp://send?text=hello');
    });
  });

  describe('sanitizeJid - Brazilian variations', () => {
    it('handles number with +55 prefix', () => {
      // When stripped of non-digits, +5511999999999 becomes 5511999999999 (13 digits)
      expect(sanitizeJid('+5511999999999')).toBe('5511999999999@s.whatsapp.net');
    });

    it('rejects SQL injection in JID', () => {
      expect(sanitizeJid("'; DROP TABLE messages; --")).toBeNull();
    });

    it('handles group JID format', () => {
      expect(sanitizeJid('120363041234567890@g.us')).toBe('120363041234567890@g.us');
    });
  });

  describe('sanitizeDisplayName - unicode attacks', () => {
    it('removes right-to-left override characters', () => {
      const rtl = '\u202Egnp.exe';
      expect(sanitizeDisplayName(rtl)).not.toContain('\u202E');
    });

    it('handles emoji in names', () => {
      expect(sanitizeDisplayName('Jo\u00e3o \uD83D\uDE00 Silva')).toBe('Jo\u00e3o \uD83D\uDE00 Silva');
    });

    it('handles very long unicode strings', () => {
      const longEmoji = '\uD83D\uDE00'.repeat(200);
      expect(sanitizeDisplayName(longEmoji).length).toBeLessThanOrEqual(100);
    });
  });

  describe('sanitizePhone - Brazilian formats', () => {
    it('handles formatted with parentheses', () => {
      expect(sanitizePhone('(11) 99999-9999')).toBe('(11) 99999-9999');
    });

    it('strips HTML from phone', () => {
      const result = sanitizePhone('+55<b>11</b>999999999');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });
  });

  describe('createRateLimiter - concurrency', () => {
    it('handles rapid successive calls', () => {
      const limiter = createRateLimiter(3, 100);
      expect(limiter.canProceed()).toBe(true);
      expect(limiter.canProceed()).toBe(true);
      expect(limiter.canProceed()).toBe(true);
      expect(limiter.canProceed()).toBe(false);
    });
  });
});
