/**
 * sanitize.ts
 * Centralized XSS sanitization using DOMPurify.
 * OWASP A03:2021 – Injection mitigation.
 * ALL user-supplied text rendered into the DOM MUST pass through here.
 */
import DOMPurify from 'dompurify';

// ── Configs ────────────────────────────────────────────────────────────────

/** Strips ALL HTML — use for names, phones, emails, tags */
const PLAIN_TEXT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

/** Allows limited safe formatting — use for notes, descriptions */
const RICH_TEXT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'ul', 'ol', 'li', 'a'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  FORCE_BODY: true,
};

// Force all links to open safely
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Strip ALL HTML — safe for names, phones, emails, custom field values.
 */
export function sanitizeText(input: unknown): string {
  if (input === null || input === undefined) return '';
  return DOMPurify.sanitize(String(input), PLAIN_TEXT_CONFIG);
}

/**
 * Allow limited safe HTML — safe for notes, descriptions, internal comments.
 */
export function sanitizeHtml(input: unknown): string {
  if (input === null || input === undefined) return '';
  return DOMPurify.sanitize(String(input), RICH_TEXT_CONFIG);
}

/**
 * Sanitize all string fields of a contact record before rendering.
 * Notes/description get rich-text treatment; all other strings are plain text.
 */
export function sanitizeContactFields<T extends Record<string, unknown>>(contact: T): T {
  const RICH_KEYS = new Set(['notes', 'description', 'internal_notes']);
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(contact)) {
    if (typeof value === 'string') {
      result[key] = RICH_KEYS.has(key) ? sanitizeHtml(value) : sanitizeText(value);
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeContactFields(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Sanitize custom_fields JSONB object — all keys and values become plain text.
 */
export function sanitizeCustomFields(
  fields: Record<string, unknown> | null | undefined
): Record<string, string> {
  if (!fields) return {};
  return Object.fromEntries(
    Object.entries(fields).map(([k, v]) => [sanitizeText(k), sanitizeText(v)])
  );
}
