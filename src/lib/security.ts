/**
 * Security utilities for ZAPP WEB.
 *
 * Provides XSS prevention, input sanitization, and safe HTML rendering
 * for user-generated content (messages, contact names, notes, etc.).
 */

// Characters that could be used in XSS attacks
const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
};

/**
 * Escapes HTML special characters to prevent XSS in user-generated content.
 * Use this when rendering user input that shouldn't contain HTML.
 */
export function escapeHtml(unsafe: string): string {
  return unsafe.replace(/[&<>"'`/]/g, (char) => HTML_ENTITY_MAP[char] || char);
}

/**
 * Strips all HTML tags from a string, leaving only text content.
 * Useful for cleaning rich-text content before storing as plain text.
 */
export function stripHtml(html: string): string {
  // Use DOMParser when available (browser), regex fallback for SSR
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  }
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Sanitizes a URL to prevent javascript: and data: protocol attacks.
 * Returns the URL if safe, or '#' if potentially malicious.
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  // Block dangerous protocols
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:text/html') ||
    lower.startsWith('vbscript:')
  ) {
    return '#';
  }

  // Allow safe protocols
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:') ||
    lower.startsWith('whatsapp:') ||
    lower.startsWith('/') ||
    lower.startsWith('#')
  ) {
    return trimmed;
  }

  // Assume https for bare domains
  if (lower.match(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?\./)) {
    return `https://${trimmed}`;
  }

  return '#';
}

/**
 * Sanitizes a phone number, keeping only digits, + and -.
 * Prevents injection via phone number fields.
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+\-\s()]/g, '').trim();
}

/**
 * Truncates a string to a maximum length, adding ellipsis if needed.
 * Prevents excessively long strings from breaking the UI.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

/**
 * Sanitizes contact/user display names.
 * Removes control characters and limits length.
 */
export function sanitizeDisplayName(name: string, maxLength = 100): string {
  // Remove zero-width characters, control chars, and direction overrides
  const cleaned = name
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF\u0000-\u001F\u007F-\u009F]/g, '')
    .trim();

  return truncate(cleaned, maxLength);
}

/**
 * Validates and sanitizes a WhatsApp JID (remoteJid).
 * Expected format: digits@s.whatsapp.net or digits-timestamp@g.us
 */
export function sanitizeJid(jid: string): string | null {
  // Individual: 5511999999999@s.whatsapp.net
  // Group: 120363XXXX@g.us
  const jidPattern = /^[\d\-]+@(s\.whatsapp\.net|g\.us|lid|newsletter)$/;
  const trimmed = jid.trim();

  if (jidPattern.test(trimmed)) {
    return trimmed;
  }

  // Try to extract phone and construct JID
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return `${digitsOnly}@s.whatsapp.net`;
  }

  return null;
}

/**
 * Rate limiter for preventing abuse of API-calling functions.
 * Returns a function that tracks calls and returns true if within limits.
 */
export function createRateLimiter(maxCalls: number, windowMs: number) {
  const timestamps: number[] = [];

  return {
    canProceed(): boolean {
      const now = Date.now();
      // Remove timestamps outside the window
      while (timestamps.length > 0 && timestamps[0] < now - windowMs) {
        timestamps.shift();
      }
      if (timestamps.length >= maxCalls) {
        return false;
      }
      timestamps.push(now);
      return true;
    },
    reset() {
      timestamps.length = 0;
    },
  };
}
