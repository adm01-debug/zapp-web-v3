/**
 * normalizePhoneBR.ts
 * Robust Brazilian phone number normalization.
 * Solves Gap #2: Inconsistent phone format handling.
 *
 * Handles: +55, 0xx, with/without 9th digit, DDD variations.
 * Returns E.164 format: +5511999999999
 */

const BRAZIL_COUNTRY_CODE = '55';
const MOBILE_DDDS_WITHOUT_9TH = new Set<string>();
// All Brazilian DDDs now require the 9th digit for mobile

/**
 * Normalize a Brazilian phone number to E.164 format.
 * Accepts any combination of formats:
 *   - 11999999999
 *   - (11) 99999-9999
 *   - +55 11 99999-9999
 *   - 011 99999-9999
 *   - 5511999999999
 */
export function normalizePhoneBR(raw: string): string {
  if (!raw) return '';

  // Strip everything non-numeric
  let digits = raw.replace(/\D/g, '');

  // Remove leading zeros (trunk prefix)
  digits = digits.replace(/^0+/, '');

  // Remove country code if present
  if (digits.startsWith(BRAZIL_COUNTRY_CODE) && digits.length >= 12) {
    digits = digits.slice(2);
  }

  // At this point we should have DDD + number
  // DDD = 2 digits, Number = 8 or 9 digits
  if (digits.length === 10) {
    // Landline (8 digits) or mobile without 9th digit
    const ddd = digits.slice(0, 2);
    const number = digits.slice(2);
    // If it starts with [6-9], it's likely a mobile missing the 9th digit
    if (/^[6-9]/.test(number)) {
      digits = ddd + '9' + number;
    }
  }

  // Validate final length
  if (digits.length === 11) {
    // Valid: DDD(2) + 9 + number(8) = 11 digits
    return `+${BRAZIL_COUNTRY_CODE}${digits}`;
  }

  if (digits.length === 10) {
    // Valid landline: DDD(2) + number(8) = 10 digits
    return `+${BRAZIL_COUNTRY_CODE}${digits}`;
  }

  // International number or already E.164 — return as-is with +
  if (raw.startsWith('+')) return raw;
  return `+${digits}`;
}

/**
 * Format a phone number for display.
 * +5511999999999 → (11) 99999-9999
 * +551133334444  → (11) 3333-4444
 */
export function formatPhoneBR(phone: string): string {
  const normalized = normalizePhoneBR(phone);
  const digits = normalized.replace(/\D/g, '');

  // Brazilian mobile: country(2) + ddd(2) + 9 + number(8) = 13
  if (digits.length === 13 && digits.startsWith(BRAZIL_COUNTRY_CODE)) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 9);
    const part2 = digits.slice(9, 13);
    return `(${ddd}) ${part1}-${part2}`;
  }

  // Brazilian landline: country(2) + ddd(2) + number(8) = 12
  if (digits.length === 12 && digits.startsWith(BRAZIL_COUNTRY_CODE)) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 8);
    const part2 = digits.slice(8, 12);
    return `(${ddd}) ${part1}-${part2}`;
  }

  // Fallback: return as-is
  return phone;
}

/**
 * Compare two phone numbers for equality, ignoring formatting.
 * Handles 9th digit discrepancy.
 */
export function phonesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const na = normalizePhoneBR(a);
  const nb = normalizePhoneBR(b);
  if (na === nb) return true;

  // Fallback: compare last 8 digits
  const da = na.replace(/\D/g, '').slice(-8);
  const db = nb.replace(/\D/g, '').slice(-8);
  return da === db;
}

/**
 * Extract the last 8 significant digits for fuzzy matching.
 */
export function phoneFingerprint(phone: string): string {
  return phone.replace(/\D/g, '').slice(-8);
}
