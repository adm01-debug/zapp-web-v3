/**
 * Brazilian phone number normalizer for WhatsApp.
 *
 * Handles the complexities of Brazilian phone numbers:
 * - Mobile numbers have 9 digits (with the 9th digit added in 2012+)
 * - Landlines have 8 digits
 * - Country code: +55
 * - DDD (area code): 2 digits (11-99)
 * - Some contacts arrive without the 9th digit from older databases
 * - Some arrive with +55, some without, some with just the DDD
 *
 * This normalizer ensures all phone numbers are in the format
 * expected by the Evolution API: 5511999999999 (no +, no spaces)
 */

/** DDDs that require the 9th digit for mobile numbers */
const MOBILE_9TH_DIGIT_DDDS = new Set([
  '11','12','13','14','15','16','17','18','19', // SP
  '21','22','24', // RJ
  '27','28', // ES
  '31','32','33','34','35','37','38', // MG
  '41','42','43','44','45','46', // PR
  '47','48','49', // SC
  '51','53','54','55', // RS
  '61','62','63','64','65','66','67','68','69', // Centro-Oeste/Norte
  '71','73','74','75','77', // BA
  '79', // SE
  '81','82','83','84','85','86','87','88','89', // Nordeste
  '91','92','93','94','95','96','97','98','99', // Norte
]);

/**
 * Normalizes a Brazilian phone number to WhatsApp format.
 *
 * @param phone - Raw phone string (e.g., "+55 (11) 9 9999-9999", "11999999999", etc.)
 * @returns Normalized phone (e.g., "5511999999999") or null if invalid
 */
export function normalizeBrazilianPhone(phone: string): string | null {
  // Strip everything except digits
  const digits = phone.replace(/\D/g, '');

  // Already in full format: 55 + DDD + 9-digit number = 13 digits
  if (digits.length === 13 && digits.startsWith('55')) {
    return digits;
  }

  // Full format without 9th digit: 55 + DDD + 8-digit number = 12 digits
  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const number = digits.slice(4);
    // Add 9th digit if it's a mobile number (starts with [6-9] after DDD)
    if (MOBILE_9TH_DIGIT_DDDS.has(ddd) && /^[6-9]/.test(number)) {
      return `55${ddd}9${number}`;
    }
    return digits; // Landline — keep 8 digits
  }

  // DDD + 9-digit number = 11 digits
  if (digits.length === 11) {
    const possibleDdd = digits.slice(0, 2);
    // Must be valid DDD AND 3rd digit must be 9 (BR mobile pattern)
    if (MOBILE_9TH_DIGIT_DDDS.has(possibleDdd) && digits[2] === '9') {
      return `55${digits}`;
    }
    // If starts with valid DDD but not mobile (landline), still add 55
    if (MOBILE_9TH_DIGIT_DDDS.has(possibleDdd)) {
      return `55${digits}`;
    }
    return digits; // Not a Brazilian DDD — likely international
  }

  // DDD + 8-digit number = 10 digits (missing 9th digit)
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const number = digits.slice(2);
    if (MOBILE_9TH_DIGIT_DDDS.has(ddd) && /^[6-9]/.test(number)) {
      return `55${ddd}9${number}`;
    }
    return `55${digits}`; // Landline
  }

  // Just the number without DDD (8-9 digits) — can't normalize without DDD
  if (digits.length === 8 || digits.length === 9) {
    return null; // Need DDD to construct full number
  }

  // International number (not Brazil)
  if (digits.length > 10 && !digits.startsWith('55')) {
    return digits; // Return as-is for non-Brazilian numbers
  }

  return null; // Invalid
}

/**
 * Constructs a WhatsApp JID from a phone number.
 */
export function phoneToJid(phone: string): string | null {
  const normalized = normalizeBrazilianPhone(phone);
  if (!normalized) return null;
  return `${normalized}@s.whatsapp.net`;
}

/**
 * Formats a normalized phone for display: +55 (11) 99999-9999
 */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 13 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 9);
    const part2 = digits.slice(9);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }

  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 8);
    const part2 = digits.slice(8);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }

  // Fallback: return with + prefix
  return `+${digits}`;
}
