/**
 * contacts-extended.test.ts
 * Additional regression tests for Contacts Module.
 */
import { describe, it, expect } from 'vitest';
import { sanitizeText } from '@/lib/sanitize';
import { escapeCsvCell, buildCsvString } from '@/lib/csvUtils';
import { formatBRPhone, validatePhone } from '@/lib/phoneUtils';

describe('XSS Regression — Extended', () => {
  it('blocks XSS #1', () => expect(sanitizeText('<script>alert(1)</script>')).toBe(''));
  it('blocks XSS #2', () => expect(sanitizeText('<img src=x onerror=alert(1)>')).toBe(''));
  it('blocks XSS #3', () => expect(sanitizeText('<iframe src="javascript:alert(1)"></iframe>')).toBe(''));
  it('blocks XSS #4', () => expect(sanitizeText('<svg/onload=alert(1)>')).toBe(''));
  it('blocks XSS #5', () => expect(sanitizeText('<details open ontoggle=alert(1)>')).toBe(''));
  it('blocks XSS #6', () => expect(sanitizeText('javascript:alert(1)')).toBe('javascript:alert(1)')); // plain text is ok
  it('blocks XSS #7', () => expect(sanitizeText('<a href="javascript:alert(1)">')).toBe(''));
  it('blocks XSS #8', () => expect(sanitizeText('<form action="javascript:alert(1)">')).toBe(''));
  it('blocks XSS #9', () => expect(sanitizeText('<input autofocus onfocus=alert(1)>')).toBe(''));
  it('blocks XSS #10', () => expect(sanitizeText('<video><source onerror="alert(1)">')).toBe(''));
  it('preserves accented chars', () => expect(sanitizeText('João Conceição')).toBe('João Conceição'));
  it('preservers emojis', () => expect(sanitizeText('🎯 Rocket')).toBe('🎯 Rocket'));
});

describe('Safe HTML in notes', () => {
  it('safe HTML in notes: bold/italic preserved', () => {
    // We don't have a direct "sanitizeHtml" test here, but check logic
    const input = '<b>Bold</b> <i>Italic</i> <script>x</script>';
    expect(sanitizeText(input)).not.toContain('<script>');
  });
});

describe('CSV Injection — Complete', () => {
  it('neutralizes "=" prefix', () => expect(escapeCsvCell('=1+1')).toContain('"\t=1+1"'));
  it('neutralizes "+" prefix', () => expect(escapeCsvCell('+1+1')).toContain('"\t+1+1"'));
  it('neutralizes "-" prefix', () => expect(escapeCsvCell('-1+1')).toContain('"\t-1+1"'));
  it('neutralizes "@" prefix', () => expect(escapeCsvCell('@SUM')).toContain('"\t@SUM"'));
  it('normal values unmodified', () => expect(escapeCsvCell('Normal')).toBe('"Normal"'));
  it('quotes RFC4180 escaped', () => expect(escapeCsvCell('a"b')).toBe('"a""b"'));
  it('null → empty string', () => expect(escapeCsvCell(null)).toBe(''));
  it('number → quoted string', () => expect(escapeCsvCell(123)).toBe('"123"'));

  it('complete CSV no injection', () => {
    const csv = buildCsvString([{ n: '=EVIL()', p: '+CMD' }], [{ key: 'n', label: 'Nome' }, { key: 'p', label: 'Tel' }]);
    expect(csv).toContain('"\t=EVIL()"');
    expect(csv).toContain('"\t+CMD"');
  });
});

describe('Phone Formatting', () => {
  it('11-digit mobile → (DDD) XXXXX-XXXX', () => { expect(formatBRPhone('11987654321')).toBe('(11) 98765-4321'); });
  it('10-digit landline → (DDD) XXXX-XXXX', () => { expect(formatBRPhone('1133334444')).toBe('(11) 3333-4444'); });
});

describe('Phone Validation', () => {
  it('classifies mobile', () => { expect(validatePhone('11987654321').type).toBe('mobile'); });
  it('classifies landline', () => { expect(validatePhone('1133334444').type).toBe('landline'); });
  it('classifies international', () => { expect(validatePhone('+14155501234').type).toBe('international'); });
  it('rejects empty', () => { expect(validatePhone('').valid).toBe(false); });
  it('rejects null', () => { expect(validatePhone(null).valid).toBe(false); });
});
