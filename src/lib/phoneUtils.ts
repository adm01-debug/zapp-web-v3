/**
 * phoneUtils.ts — v2.0
 * Brazilian phone number utilities.
 * Handles normalization, validation, formatting and WhatsApp JID conversion.
 *
 * Rules:
 * - Mobile in Brazil: DDD (2 digits) + 9 + 8 digits = 11 digits total
 * - Landline in Brazil: DDD (2 digits) + 8 digits = 10 digits total
 * - 9th digit: added if mobile and missing (10 digit numbers starting with 6-9)
 * - Country code: +55 or 55 prefix stripped
 * - WhatsApp JID: phone@c.us or phone@s.whatsapp.net
 */

// ── All valid BR area codes (DDDs) ─────────────────────────────────────────

const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, // SP
  21, 22, 24,                          // RJ/ES
  27, 28,                              // ES
  31, 32, 33, 34, 35, 37, 38,          // MG
  41, 42, 43, 44, 45, 46,              // PR
  47, 48, 49,                          // SC
  51, 53, 54, 55,                      // RS
  61,                                  // DF
  62, 64,                              // GO
  63,                                  // TO
  65, 66,                              // MT
  67,                                  // MS
  68,                                  // AC
  69,                                  // RO
  71, 73, 74, 75, 77,                  // BA
  79,                                  // SE
  81, 87,                              // PE
  82,                                  // AL
  83,                                  // PB
  84,                                  // RN
  85, 88,                              // CE
  86, 89,                              // PI
  91, 93, 94,                          // PA
  92, 97,                              // AM
  95,                                  // RR
  96,                                  // AP
  98, 99,                              // MA
]);

// ── normalizePhone ─────────────────────────────────────────────────────────

/**
 * Normalize a phone number to digits-only BR format.
 * Returns null for invalid/unparseable inputs.
 *
 * @param input Phone in any common format
 * @returns Normalized digits (e.g. "11987654321") or null
 *
 * @example
 * normalizePhone("+55 (11) 9 8765-4321") → "11987654321"
 * normalizePhone("5511987654321@c.us")   → "11987654321"
 * normalizePhone("+14155550100")         → "14155550100" (international)
 * normalizePhone("invalid")              → null
 */
export function normalizePhone(input: unknown): string | null {
  if (!input) return null;
  let str = typeof input === 'string' ? input : String(input);

  // Strip WhatsApp JID suffixes
  str = str.replace(/@c\.us$/, '').replace(/@s\.whatsapp\.net$/, '').replace(/@.*$/, '');

  // Extract only digits
  const digits = str.replace(/[^0-9+]/g, '');
  if (!digits) return null;

  // Strip leading + sign
  const rawDigits = digits.startsWith('+') ? digits.slice(1) : digits;

  // International format starting with country code != 55
  if (rawDigits.startsWith('1') && rawDigits.length === 11) return rawDigits;   // USA
  if (rawDigits.startsWith('44') && rawDigits.length >= 11) return rawDigits;   // UK
  if (rawDigits.startsWith('351') && rawDigits.length >= 11) return rawDigits;  // PT
  if (rawDigits.startsWith('49') && rawDigits.length >= 10) return rawDigits;   // DE

  // Strip Brazilian country code 55
  let br = rawDigits;
  if (br.startsWith('55') && br.length >= 12 && br.length <= 13) br = br.slice(2);

  // Validate length for BR numbers
  if (br.length < 8 || br.length > 11) {
    // Could be international without explicit country code
    if (rawDigits.length >= 10 && rawDigits.length <= 15) return rawDigits;
    return null;
  }

  // If 8 or 9 digits, it's a number without DDD — cannot normalize
  if (br.length < 10) return null;

  // Add 9th digit for mobile 10-digit numbers
  if (br.length === 10) {
    const ddd = parseInt(br.slice(0, 2), 10);
    const firstDigit = br[2];
    // Add 9 only if it looks like a mobile (starts with 6-9) and DDD is valid
    if (['6', '7', '8', '9'].includes(firstDigit) && VALID_DDDS.has(ddd)) {
      br = br.slice(0, 2) + '9' + br.slice(2);
    }
  }

  return br;
}

// ── formatBRPhone ──────────────────────────────────────────────────────────

/**
 * Format a normalized BR phone for display.
 * Input should already be normalized (digits only, no country code).
 *
 * @example
 * formatBRPhone("11987654321") → "(11) 98765-4321"
 * formatBRPhone("1133334444")  → "(11) 3333-4444"
 */
export function formatBRPhone(digits: string): string {
  if (!digits) return '';
  const d = digits.replace(/[^0-9]/g, '');

  if (d.length === 11) {
    // Mobile: (DDD) 9XXXX-XXXX
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    // Landline: (DDD) XXXX-XXXX
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return digits;
}

// ── formatPhoneForDisplay ──────────────────────────────────────────────────

/**
 * Format any phone input for display. Normalizes first, then formats.
 * Falls back to original if normalization fails.
 *
 * @example
 * formatPhoneForDisplay("11987654321")    → "(11) 98765-4321"
 * formatPhoneForDisplay("+14155550100")   → "+14155550100"  (international, no BR format)
 * formatPhoneForDisplay(null)             → ""
 * formatPhoneForDisplay("invalid")        → "invalid"
 */
export function formatPhoneForDisplay(input: unknown): string {
  if (!input) return '';
  const normalized = normalizePhone(input);
  if (!normalized) return String(input);

  // Only format if it's a valid BR number (10 or 11 digits, valid DDD)
  const ddd = parseInt(normalized.slice(0, 2), 10);
  if ((normalized.length === 10 || normalized.length === 11) && VALID_DDDS.has(ddd)) {
    return formatBRPhone(normalized);
  }

  // International: keep with + prefix
  return `+${normalized}`;
}

// ── validatePhone ──────────────────────────────────────────────────────────

export interface PhoneValidationResult {
  valid:     boolean;
  type:      'mobile' | 'landline' | 'international' | 'invalid';
  formatted: string;
  normalized: string | null;
  error?:    string;
}

/**
 * Validate a phone number and return full analysis.
 *
 * @example
 * validatePhone("11987654321") → { valid: true, type: 'mobile', formatted: "(11) 98765-4321" }
 * validatePhone("")            → { valid: false, type: 'invalid', error: 'Número vazio.' }
 */
export function validatePhone(input: unknown): PhoneValidationResult {
  if (!input || (typeof input === 'string' && !input.trim())) {
    return { valid: false, type: 'invalid', formatted: '', normalized: null, error: 'Número vazio.' };
  }

  const normalized = normalizePhone(input);
  if (!normalized) {
    return { valid: false, type: 'invalid', formatted: String(input), normalized: null, error: 'Número inválido.' };
  }

  const ddd = parseInt(normalized.slice(0, 2), 10);
  const isBR = (normalized.length === 10 || normalized.length === 11) && VALID_DDDS.has(ddd);

  if (isBR) {
    const isMobile = normalized.length === 11;
    if (isMobile) {
      return { valid: true, type: 'mobile', formatted: formatBRPhone(normalized), normalized };
    } else {
      return { valid: true, type: 'landline', formatted: formatBRPhone(normalized), normalized };
    }
  }

  // International
  if (normalized.length >= 10 && normalized.length <= 15) {
    return { valid: true, type: 'international', formatted: `+${normalized}`, normalized };
  }

  return { valid: false, type: 'invalid', formatted: String(input), normalized: null, error: 'DDD ou formato inválido.' };
}

// ── phonesMatch ────────────────────────────────────────────────────────────

/**
 * Check if two phone numbers refer to the same subscriber.
 * Handles format differences, 9th digit, country code, JID.
 *
 * @example
 * phonesMatch("1187654321", "11987654321") → true   (9th digit)
 * phonesMatch("+5511987654321", "11987654321") → true (country code)
 * phonesMatch("5511987654321@c.us", "11987654321") → true (JID)
 * phonesMatch(null, "11987654321") → false
 */
export function phonesMatch(a: unknown, b: unknown): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na === nb;
}

// ── WhatsApp JID conversion ────────────────────────────────────────────────

/**
 * Convert a normalized BR phone to WhatsApp JID.
 * @example "11987654321" → "5511987654321@c.us"
 */
export function toWhatsAppJID(phone: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized) return '';
  const ddd = parseInt(normalized.slice(0, 2), 10);
  // Only prepend 55 for BR numbers
  const prefix = VALID_DDDS.has(ddd) ? '55' : '';
  return `${prefix}${normalized}@c.us`;
}

/**
 * Extract normalized phone from a WhatsApp JID.
 * @example "5511987654321@c.us" → "11987654321"
 */
export function fromWhatsAppJID(jid: string): string | null {
  return normalizePhone(jid);
}

/**
 * Check if a string looks like a valid WhatsApp JID.
 */
export function isWhatsAppJID(str: string): boolean {
  return /^[0-9]+@(c\.us|s\.whatsapp\.net)$/.test(str);
}
