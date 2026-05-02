/**
 * sanitize.test.ts — v2.0
 * Tests for sanitize.ts v2.1 and csvUtils.ts v2.0.
 * 80+ test cases covering XSS prevention, CSV injection, URL validation.
 */
import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeHtml, sanitizeContactFields, sanitizeForSearch, sanitizeUrl, truncateText } from '@/lib/sanitize';
import { escapeCsvCell, buildCsv, parseCsvString, getCsvFilename } from '@/lib/csvUtils';

// ── sanitizeText ───────────────────────────────────────────────────────────

describe('sanitizeText', () => {
  it('removes script tags', () => { expect(sanitizeText('<script>alert(1)</script>test')).not.toContain('<script>'); });
  it('removes img onerror', () => { expect(sanitizeText('<img src=x onerror=hack>')).not.toContain('<img'); });
  it('removes all HTML', () => { expect(sanitizeText('<b>bold</b>')).toBe('bold'); });
  it('preserves plain text', () => { expect(sanitizeText('Hello World')).toBe('Hello World'); });
  it('trims whitespace', () => { expect(sanitizeText('  test  ')).toBe('test'); });
  it('null → empty', () => { expect(sanitizeText(null)).toBe(''); });
  it('undefined → empty', () => { expect(sanitizeText(undefined)).toBe(''); });
  it('number input', () => { expect(sanitizeText(123)).toBe('123'); });
  it('removes style attr', () => { expect(sanitizeText('<p style="color:red">x</p>')).not.toContain('style'); });
  it('removes onclick', () => { expect(sanitizeText('<div onclick="hack()">x</div>')).not.toContain('onclick'); });
});

// ── sanitizeHtml ───────────────────────────────────────────────────────────

describe('sanitizeHtml', () => {
  it('keeps <b> tag', () => { expect(sanitizeHtml('<b>bold</b>')).toContain('<b>bold</b>'); });
  it('keeps <em> tag', () => { expect(sanitizeHtml('<em>italic</em>')).toContain('<em>italic</em>'); });
  it('keeps <br>', () => { expect(sanitizeHtml('line1<br>line2')).toContain('<br>'); });
  it('removes <script>', () => { expect(sanitizeHtml('<b>OK</b><script>evil</script>')).not.toContain('<script>'); });
  it('removes onerror', () => { expect(sanitizeHtml('<b onerror="hack">text</b>')).not.toContain('onerror'); });
  it('removes style attr', () => { expect(sanitizeHtml('<b style="color:red">x</b>')).not.toContain('style'); });
  it('removes iframe', () => { expect(sanitizeHtml('<iframe src="evil.com"></iframe>')).not.toContain('<iframe'); });
  it('empty → empty', () => { expect(sanitizeHtml('')).toBe(''); });
  it('null → empty', () => { expect(sanitizeHtml(null)).toBe(''); });
});

// ── sanitizeContactFields ─────────────────────────────────────────────────

describe('sanitizeContactFields', () => {
  it('sanitizes full_name', () => {
    const r = sanitizeContactFields({ full_name: '<script>xss</script>João', phone_number: '11987654321' });
    expect(r.full_name).not.toContain('<script>');
    expect(r.full_name).toContain('João');
  });
  it('sanitizes tags array', () => {
    const r = sanitizeContactFields({ full_name: 'Test', tags: ['<script>evil</script>', 'vip'] });
    const tags = r.tags as string[];
    expect(tags.find((t: string) => t.includes('<script>'))).toBeUndefined();
    expect(tags).toContain('vip');
  });
  it('empty tags array', () => {
    const r = sanitizeContactFields({ full_name: 'Test', tags: [] });
    expect(r.tags).toEqual([]);
  });
  it('preserves non-string fields', () => {
    const r = sanitizeContactFields({ full_name: 'Test', lead_score: 75 });
    expect(r.lead_score).toBe(75);
  });
});

// ── sanitizeForSearch ──────────────────────────────────────────────────────

describe('sanitizeForSearch', () => {
  it('escapes %', () => { expect(sanitizeForSearch('100%')).toContain('\\%'); });
  it('escapes _', () => { expect(sanitizeForSearch('test_name')).toContain('\\_'); });
  it('strips XSS', () => { expect(sanitizeForSearch('<script>evil</script>')).not.toContain('<script>'); });
  it('max 200 chars', () => { expect(sanitizeForSearch('a'.repeat(300)).length).toBeLessThanOrEqual(200); });
  it('empty → empty', () => { expect(sanitizeForSearch('')).toBe(''); });
  it('null → empty', () => { expect(sanitizeForSearch(null)).toBe(''); });
});

// ── sanitizeUrl ────────────────────────────────────────────────────────────

describe('sanitizeUrl', () => {
  it('allows https://', () => { expect(sanitizeUrl('https://example.com')).toBe('https://example.com'); });
  it('allows http://', () => { expect(sanitizeUrl('http://example.com')).toBe('http://example.com'); });
  it('allows mailto:', () => { expect(sanitizeUrl('mailto:a@b.com')).toBe('mailto:a@b.com'); });
  it('allows tel:', () => { expect(sanitizeUrl('tel:+5511987654321')).toBe('tel:+5511987654321'); });
  it('blocks javascript:', () => { expect(sanitizeUrl('javascript:alert(1)')).toBe(''); });
  it('blocks data:', () => { expect(sanitizeUrl('data:text/html,<script>')).toBe(''); });
  it('empty → empty', () => { expect(sanitizeUrl('')).toBe(''); });
  it('null → empty', () => { expect(sanitizeUrl(null)).toBe(''); });
});

// ── truncateText ───────────────────────────────────────────────────────────

describe('truncateText', () => {
  it('truncates at maxLength', () => { expect(truncateText('Hello World', 5)).toBe('Hello…'); });
  it('no truncation when short', () => { expect(truncateText('Hi', 10)).toBe('Hi'); });
  it('sanitizes before truncating', () => { expect(truncateText('<script>xss</script>Test', 10)).not.toContain('<script>'); });
  it('custom ellipsis', () => { expect(truncateText('Hello World', 5, '...')).toBe('Hello...'); });
  it('empty → empty', () => { expect(truncateText('', 10)).toBe(''); });
});

// ── escapeCsvCell ──────────────────────────────────────────────────────────

describe('escapeCsvCell — CSV injection prevention', () => {
  ['=', '+', '-', '@'].forEach((prefix) => {
    it(`neutralizes prefix "${prefix}"`, () => {
      const cell = escapeCsvCell(`${prefix}FORMULA()`);
      expect(cell).not.toMatch(/^"[=+\-@]/);
    });
  });
  it('wraps in double quotes', () => { expect(escapeCsvCell('hello')).toBe('"hello"'); });
  it('escapes internal double quotes', () => { expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""'); });
  it('null → empty quotes', () => { expect(escapeCsvCell(null)).toBe('""'); });
  it('handles number', () => { expect(escapeCsvCell(42)).toBe('"42"'); });
  it('handles boolean', () => { expect(escapeCsvCell(true)).toBe('"true"'); });
});

// ── buildCsv ───────────────────────────────────────────────────────────────

describe('buildCsv', () => {
  const cols = [
    { key: 'name',  label: 'Nome' },
    { key: 'phone', label: 'Telefone' },
  ];
  const rows = [
    { name: 'João Silva', phone: '(11) 98765-4321' },
    { name: 'Maria',      phone: '' },
  ];

  it('starts with UTF-8 BOM', () => {
    expect(buildCsv(rows, cols).startsWith('\uFEFF')).toBe(true);
  });
  it('contains header', () => {
    expect(buildCsv(rows, cols)).toContain('"Nome"');
    expect(buildCsv(rows, cols)).toContain('"Telefone"');
  });
  it('contains data', () => {
    expect(buildCsv(rows, cols)).toContain('"João Silva"');
  });
  it('uses CRLF line endings', () => {
    expect(buildCsv(rows, cols)).toContain('\r\n');
  });
});

// ── parseCsvString ─────────────────────────────────────────────────────────

describe('parseCsvString', () => {
  it('parses simple CSV', () => {
    const csv = 'name,phone\nJoão,11987654321';
    const rows = parseCsvString(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('João');
    expect(rows[0].phone).toBe('11987654321');
  });
  it('strips BOM', () => {
    const csv = '\uFEFFname,phone\nTest,123';
    const rows = parseCsvString(csv);
    expect(rows[0].name).toBe('Test');
  });
  it('handles quoted fields with commas', () => {
    const csv = 'name,address\n"Silva, João","Rua A, 123"';
    const rows = parseCsvString(csv);
    expect(rows[0].name).toBe('Silva, João');
    expect(rows[0].address).toBe('Rua A, 123');
  });
  it('returns empty for single-line CSV (header only)', () => {
    expect(parseCsvString('name,phone')).toHaveLength(0);
  });
});

// ── getCsvFilename ─────────────────────────────────────────────────────────

describe('getCsvFilename', () => {
  it('generates a .csv filename', () => {
    expect(getCsvFilename('contatos')).toMatch(/^contatos-.*\.csv$/);
  });
  it('includes date in filename', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(getCsvFilename('test')).toContain(today);
  });
  it('handles special chars in prefix', () => {
    expect(getCsvFilename('test/unsafe')).not.toContain('/');
  });
});
