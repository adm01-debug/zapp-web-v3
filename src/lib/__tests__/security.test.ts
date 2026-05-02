import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  stripHtml,
  sanitizeUrl,
  sanitizePhone,
  sanitizeDisplayName,
  sanitizeJid,
  truncate,
  createRateLimiter,
} from '../security';

describe('security utilities', () => {
  describe('escapeHtml', () => {
    it('escapes HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );
    });

    it('escapes ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('returns plain text unchanged', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });

    it('escapes backticks and single quotes', () => {
      expect(escapeHtml("it's a `test`")).toBe("it&#39;s a &#x60;test&#x60;");
    });
  });

  describe('stripHtml', () => {
    it('removes all HTML tags', () => {
      expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
    });

    it('returns plain text unchanged', () => {
      expect(stripHtml('No HTML here')).toBe('No HTML here');
    });
  });

  describe('sanitizeUrl', () => {
    it('allows https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('allows http URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('blocks javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
      expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('#');
    });

    it('blocks data:text/html URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
    });

    it('blocks vbscript: URLs', () => {
      expect(sanitizeUrl('vbscript:msgbox')).toBe('#');
    });

    it('allows mailto: and tel: URLs', () => {
      expect(sanitizeUrl('mailto:test@test.com')).toBe('mailto:test@test.com');
      expect(sanitizeUrl('tel:+5511999999999')).toBe('tel:+5511999999999');
    });

    it('allows whatsapp: URLs', () => {
      expect(sanitizeUrl('whatsapp://send?phone=5511999999999')).toBe('whatsapp://send?phone=5511999999999');
    });

    it('adds https to bare domains', () => {
      expect(sanitizeUrl('example.com')).toBe('https://example.com');
    });

    it('allows relative paths', () => {
      expect(sanitizeUrl('/inbox')).toBe('/inbox');
    });
  });

  describe('sanitizePhone', () => {
    it('keeps valid phone characters', () => {
      expect(sanitizePhone('+55 (11) 99999-9999')).toBe('+55 (11) 99999-9999');
    });

    it('strips invalid characters', () => {
      expect(sanitizePhone('+55<script>11</script>99999')).toBe('+551199999');
    });
  });

  describe('sanitizeDisplayName', () => {
    it('removes zero-width characters', () => {
      const name = 'João\u200B Silva\u200E';
      expect(sanitizeDisplayName(name)).toBe('João Silva');
    });

    it('removes control characters', () => {
      const name = 'Test\x00User\x1F';
      expect(sanitizeDisplayName(name)).toBe('TestUser');
    });

    it('truncates long names', () => {
      const longName = 'A'.repeat(200);
      expect(sanitizeDisplayName(longName).length).toBeLessThanOrEqual(100);
    });

    it('trims whitespace', () => {
      expect(sanitizeDisplayName('  João Silva  ')).toBe('João Silva');
    });
  });

  describe('sanitizeJid', () => {
    it('accepts valid individual JIDs', () => {
      expect(sanitizeJid('5511999999999@s.whatsapp.net')).toBe('5511999999999@s.whatsapp.net');
    });

    it('accepts valid group JIDs', () => {
      expect(sanitizeJid('120363041234567890@g.us')).toBe('120363041234567890@g.us');
    });

    it('constructs JID from plain phone number', () => {
      expect(sanitizeJid('5511999999999')).toBe('5511999999999@s.whatsapp.net');
    });

    it('returns null for invalid JIDs', () => {
      expect(sanitizeJid('not-a-jid')).toBeNull();
      expect(sanitizeJid('')).toBeNull();
      expect(sanitizeJid('<script>alert(1)</script>')).toBeNull();
    });
  });

  describe('truncate', () => {
    it('truncates long strings with ellipsis', () => {
      expect(truncate('Hello World', 5)).toBe('Hell…');
    });

    it('returns short strings unchanged', () => {
      expect(truncate('Hi', 10)).toBe('Hi');
    });
  });

  describe('createRateLimiter', () => {
    it('allows calls within limit', () => {
      const limiter = createRateLimiter(3, 1000);
      expect(limiter.canProceed()).toBe(true);
      expect(limiter.canProceed()).toBe(true);
      expect(limiter.canProceed()).toBe(true);
    });

    it('blocks calls over limit', () => {
      const limiter = createRateLimiter(2, 1000);
      expect(limiter.canProceed()).toBe(true);
      expect(limiter.canProceed()).toBe(true);
      expect(limiter.canProceed()).toBe(false);
    });

    it('resets properly', () => {
      const limiter = createRateLimiter(1, 1000);
      expect(limiter.canProceed()).toBe(true);
      expect(limiter.canProceed()).toBe(false);
      limiter.reset();
      expect(limiter.canProceed()).toBe(true);
    });
  });
});
