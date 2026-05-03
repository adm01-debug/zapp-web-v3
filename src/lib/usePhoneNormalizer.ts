/**
 * usePhoneNormalizer.ts
 * Real-time phone normalization hook for Brazilian numbers.
 *
 * Handles all BR phone edge cases:
 * - 9th digit (added post-2012): 8-digit → 9-digit conversion
 * - Country code stripping (+55 / 55)
 * - Multiple formats: (11)98765-4321 / 11 9 8765 4321 / +5511987654321
 * - WhatsApp format: always needs 11 digits with 9th digit
 */
import { useCallback } from 'react';

export interface NormalizedPhone {
  raw:        string;   // original input
  digits:     string;   // only digits, no country code
  e164:       string;   // international format +55XXXXXXXXXXX
  display:    string;   // formatted for display: (11) 98765-4321
  isValid:    boolean;
  isMobile:   boolean;  // starts with 9 (9th digit present)
  whatsapp:   string;   // format for Evolution API: 5511987654321@s.whatsapp.net
  ddd:        string;   // area code
  number:     string;   // just the subscriber number
}

export function normalizePhone(raw: string): NormalizedPhone {
  const empty: NormalizedPhone = {
    raw, digits: '', e164: '', display: raw, isValid: false,
    isMobile: false, whatsapp: '', ddd: '', number: '',
  };

  if (!raw) return empty;

  // Strip all non-digits
  let digits = raw.replace(/[^0-9]/g, '');

  // Remove country code
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2);
  }

  // Handle invalid lengths
  if (digits.length < 8 || digits.length > 11) {
    return { ...empty, digits };
  }

  // Extract DDD and number
  let ddd = '';
  let number = digits;

  if (digits.length >= 10) {
    ddd = digits.slice(0, 2);
    number = digits.slice(2);
  }

  // Add 9th digit if mobile number is 8 digits (pre-2012 format)
  // Brazilian mobile numbers after 2012 always have 9 digits starting with '9'
  // Area codes (DDD) like 11, 21, etc. all have this now.
  if (ddd && number.length === 8 && /^[6-9]/.test(number)) {
    number = '9' + number;
  }

  const isMobile = number.startsWith('9') && number.length === 9;
  const fullDigits = ddd ? ddd + number : number;
  const isValid = fullDigits.length >= 8;

  // Format display
  let display = raw;
  if (ddd && number.length === 9) {
    display = `(${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
  } else if (ddd && number.length === 8) {
    display = `(${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
  }

  const e164 = ddd ? `+55${ddd}${number}` : `+55${number}`;
  const whatsapp = ddd ? `55${ddd}${number}@s.whatsapp.net` : '';

  return {
    raw, digits: fullDigits, e164, display, isValid,
    isMobile, whatsapp, ddd, number,
  };
}

/**
 * React hook for use in form fields.
 * Normalizes on every change, exposes display value and validation.
 */
export function usePhoneNormalizer() {
  const normalize = useCallback(normalizePhone, []);

  const formatForDisplay = useCallback((raw: string): string => {
    return normalize(raw).display;
  }, [normalize]);

  const getE164 = useCallback((raw: string): string => {
    return normalize(raw).e164;
  }, [normalize]);

  const getWhatsAppFormat = useCallback((raw: string): string => {
    return normalize(raw).whatsapp;
  }, [normalize]);

  const isValidPhone = useCallback((raw: string): boolean => {
    return normalize(raw).isValid;
  }, [normalize]);

  return { normalize, formatForDisplay, getE164, getWhatsAppFormat, isValidPhone };
}

export default usePhoneNormalizer;
