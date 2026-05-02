/**
 * phoneUtils.ts — v2.0
 * Brazilian phone normalization, validation, formatting.
 * Handles all edge cases: 9th digit, DDI, WhatsApp JIDs, international.
 */

const VALID_DDDS = new Set([
  11,12,13,14,15,16,17,18,19,
  21,22,24,27,28,
  31,32,33,34,35,37,38,
  41,42,43,44,45,46,47,48,49,
  51,53,54,55,
  61,62,63,64,65,66,67,68,69,
  71,73,74,75,77,79,
  81,82,83,84,85,86,87,88,89,
  91,92,93,94,95,96,97,98,99,
]);

// ── Core ───────────────────────────────────────────────────────────────────

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let clean = raw
    .replace(/@c\.us$/, '').replace(/@s\.whatsapp\.net$/, '').replace(/@g\.us$/, '');
  const hasPlus = clean.trimStart().startsWith('+');
  let digits = clean.replace(/[^0-9]/g, '');
  if (!digits) return null;

  // Strip BR country code
  let isBR = false;
  if (hasPlus) {
    if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) {
      digits = digits.slice(2); isBR = true;
    } else if (!digits.startsWith('55')) {
      return digits.length >= 7 ? digits : null; // international
    }
  } else if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) {
    digits = digits.slice(2); isBR = true;
  }

  if (!isBR) {
    const ddd = parseInt(digits.slice(0, 2), 10);
    if (VALID_DDDS.has(ddd) && digits.length >= 10) isBR = true;
  }

  if (isBR) return normalizeBR(digits);
  return digits.length >= 7 && digits.length <= 15 ? digits : null;
}

function normalizeBR(d: string): string | null {
  if (d.length < 10 || d.length > 11) return null;
  const ddd = parseInt(d.slice(0, 2), 10);
  if (!VALID_DDDS.has(ddd)) return null;
  // Add 9th digit to 10-digit mobile
  if (d.length === 10 && ['7','8','9'].includes(d[2])) {
    return d.slice(0, 2) + '9' + d.slice(2);
  }
  return d;
}

// ── Formatting ──────────────────────────────────────────────────────────────

export function formatBRPhone(n: string): string {
  if (!n || n.length < 10) return n;
  const ddd = n.slice(0, 2);
  if (n.length === 11) return `(${ddd}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${ddd}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return n;
}

export function formatPhoneForDisplay(raw: string | null | undefined): string {
  if (!raw) return '';
  const n = normalizePhone(raw);
  if (!n) return raw;
  if (n.length === 10 || n.length === 11) return formatBRPhone(n);
  return `+${n}`;
}

// ── Validation ──────────────────────────────────────────────────────────────

export interface PhoneValidationResult {
  valid: boolean;
  normalized: string | null;
  formatted: string;
  type: 'mobile' | 'landline' | 'international' | 'invalid';
  error?: string;
}

export function validatePhone(raw: string | null | undefined): PhoneValidationResult {
  if (!raw?.trim()) return { valid: false, normalized: null, formatted: '', type: 'invalid', error: 'Número vazio' };
  const n = normalizePhone(raw);
  if (!n) return { valid: false, normalized: null, formatted: raw, type: 'invalid', error: 'Formato inválido' };
  if (n.length === 11 && n[2] === '9') return { valid: true, normalized: n, formatted: formatBRPhone(n), type: 'mobile' };
  if (n.length === 10) return { valid: true, normalized: n, formatted: formatBRPhone(n), type: 'landline' };
  if (n.length >= 7) return { valid: true, normalized: n, formatted: `+${n}`, type: 'international' };
  return { valid: false, normalized: null, formatted: raw, type: 'invalid', error: 'Número muito curto' };
}

// ── WhatsApp ────────────────────────────────────────────────────────────────

export function toWhatsAppJID(normalized: string): string {
  const cc = normalized.length <= 11 ? `55${normalized}` : normalized;
  return `${cc}@c.us`;
}

export function fromWhatsAppJID(jid: string): string | null {
  return normalizePhone(jid.replace(/@.*$/, ''));
}

// ── Deduplication ───────────────────────────────────────────────────────────

export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const strip9 = (n: string) => n.length === 11 && n[2] === '9' ? n.slice(0,2) + n.slice(3) : n;
  return strip9(na) === strip9(nb);
}
