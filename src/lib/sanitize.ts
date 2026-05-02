/**
 * sanitize.ts — v2.0
 * XSS prevention utilities using DOMPurify.
 * All user input rendering MUST pass through these functions.
 *
 * OWASP A03:2021 — Injection Prevention
 * WCAG 2.1 — Accessible content must be safe
 */
import DOMPurify from 'dompurify';

// ── Config ─────────────────────────────────────────────────────────────────

/** Allowed HTML tags for rich notes (conservative whitelist) */
const RICH_ALLOWED_TAGS = ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'ul', 'ol', 'li'];
/** Allowed attributes for rich HTML */
const RICH_ALLOWED_ATTR = ['class'];

// ── Core functions ─────────────────────────────────────────────────────────

/**
 * Sanitize plain text — strips ALL HTML tags.
 * Use for: names, phones, emails, companies, tags.
 */
export function sanitizeText(input: unknown): string {
  if (input === null || input === undefined) return '';
  const str = typeof input === 'string' ? input : String(input);
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

/**
 * Sanitize rich HTML — allows safe formatting tags.
 * Use for: notes, descriptions, internal comments.
 */
export function sanitizeHtml(html: unknown): string {
  if (!html) return '';
  const str = typeof html === 'string' ? html : String(html);
  return DOMPurify.sanitize(str, {
    ALLOWED_TAGS: RICH_ALLOWED_TAGS,
    ALLOWED_ATTR: RICH_ALLOWED_ATTR,
    FORBID_SCRIPTS: true,
    FORBID_ATTR:  ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'style'],
  }).trim();
}

/**
 * Sanitize a complete contact record.
 * Applies sanitizeText to all plain-text fields and sanitizeHtml to notes.
 */
export function sanitizeContactFields<T extends Record<string, unknown>>(contact: T): T {
  const result = { ...contact };
  const textFields = ['name', 'phone', 'email', 'company', 'address', 'city', 'state', 'country', 'zip', 'channel'];
  const richFields = ['notes', 'description'];

  for (const field of textFields) {
    if (field in result) {
      result[field as keyof T] = sanitizeText(result[field]) as T[keyof T];
    }
  }

  for (const field of richFields) {
    if (field in result) {
      result[field as keyof T] = sanitizeHtml(result[field]) as T[keyof T];
    }
  }

  if (Array.isArray(result.tags)) {
    result.tags = (result.tags as string[]).map(sanitizeText).filter(Boolean) as T['tags'];
  }

  return result;
}

/**
 * Sanitize a URL — only allows http/https/mailto.
 * Prevents javascript: protocol injection.
 */
export function sanitizeUrl(url: unknown): string {
  if (!url) return '';
  const str = sanitizeText(url);
  if (/^https?:\/\//i.test(str) || /^mailto:/i.test(str)) return str;
  return '';
}
