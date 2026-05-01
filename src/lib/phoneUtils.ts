/**
 * Normalizes a phone number for comparison — strips everything except digits.
 * '+55 11 4637-5517' → '551146375517'
 * '5564984450900' → '5564984450900'
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Checks if two phone numbers are the same (ignoring formatting).
 */
export function isSamePhone(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  // Handle with/without country code: '11999' matches '5511999'
  return na === nb || na.endsWith(nb) || nb.endsWith(na);
}
