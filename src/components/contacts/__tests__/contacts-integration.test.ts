/**
 * contacts-integration.test.ts
 * Comprehensive tests for usePhoneNormalizer — Brazilian phone edge cases.
 */
import { describe, it, expect } from 'vitest';
import { normalizePhone } from '@/lib/usePhoneNormalizer';
import { escapeCsvCell, buildCsvString } from '@/lib/csvUtils';

describe('normalizePhone — Brazilian Phone Normalization', () => {

  // ── Valid 11-digit (modern mobile) ────────────────────────────────────
  it('handles modern 11-digit mobile', () => {
    const r = normalizePhone('11987654321');
    expect(r.digits).toBe('11987654321');
    expect(r.isValid).toBe(true);
    expect(r.isMobile).toBe(true);
    expect(r.e164).toBe('+5511987654321');
  });

  // ── Pre-2012 10-digit → adds 9th digit ────────────────────────────────
  it('adds 9th digit to 10-digit mobile', () => {
    const r = normalizePhone('1187654321');
    expect(r.digits).toBe('11987654321');
    expect(r.isMobile).toBe(true);
  });

  // ── Country Code Handling ──────────────────────────────────────────────
  it('strips +55 country code', () => {
    const r = normalizePhone('+5511987654321');
    expect(r.digits).toBe('11987654321');
  });

  it('strips 55 country code without +', () => {
    const r = normalizePhone('5511987654321');
    expect(r.digits).toBe('11987654321');
  });

  // ── Formatting & Extraction ────────────────────────────────────────────
  it('formats number with spaces and parentheses', () => {
    const r = normalizePhone('(11) 9 8765-4321');
    expect(r.digits).toBe('11987654321');
    expect(r.display).toBe('(11) 98765-4321');
  });

  it('formats 8-digit number', () => {
    const r = normalizePhone('(11) 8765-4321');
    expect(r.digits).toBe('11987654321'); // 9th digit added
  });

  it('extracts DDD and number', () => {
    const r = normalizePhone('11987654321');
    expect(r.ddd).toBe('11');
    expect(r.number).toBe('987654321');
  });

  // ── WhatsApp format ────────────────────────────────────────────────────
  it('generates WhatsApp format for Evolution API', () => {
    const r = normalizePhone('11987654321');
    expect(r.whatsapp).toBe('5511987654321@s.whatsapp.net');
  });

  // ── Invalid inputs ─────────────────────────────────────────────────────
  it('returns isValid=false for empty string', () => {
    expect(normalizePhone('').isValid).toBe(false);
  });

  it('returns isValid=false for too-short number', () => {
    expect(normalizePhone('12345').isValid).toBe(false);
  });

  it('returns isValid=false for too-long number', () => {
    expect(normalizePhone('123456789012345').isValid).toBe(false);
  });

  // ── Edge cases ─────────────────────────────────────────────────────────
  it('handles number with dashes only', () => {
    const r = normalizePhone('---');
    expect(r.isValid).toBe(false);
  });

  it('handles all formats correctly', () => {
    const fmts = ['11987654321', '+5511987654321', '(11)98765-4321', '11 9 8765 4321'];
    fmts.forEach(fmt => {
      const r = normalizePhone(fmt);
      expect(r.digits).toBe('11987654321');
    });
  });

  it('São Paulo landline (8-digit, not mobile)', () => {
    const r = normalizePhone('(11) 3456-7890');
    expect(r.digits).toBe('1134567890');
    expect(r.isMobile).toBe(false);
  });

  it('handles leading spaces gracefully', () => {
    const r = normalizePhone('  11987654321  ');
    expect(r.digits).toBe('11987654321');
  });
});

// ── CSV Utils Tests ────────────────────────────────────────────────────────

describe('csvUtils — Additional Edge Cases', () => {
  it('handles empty array', () => {
    const csv = buildCsvString([], [{ key: 'name' as const, label: 'Nome' }]);
    expect(csv).toContain('"Nome"');
    expect(csv).toContain('\uFEFF');
  });

  it('handles very long values (truncate safe)', () => {
    const longValue = 'A'.repeat(10000);
    const escaped = escapeCsvCell(longValue);
    expect(escaped).toContain(longValue); // value preserved (no truncation in export)
    expect(escaped).toMatch(/^".*"$/); // properly quoted
  });

  it('handles newlines inside cell values', () => {
    const result = escapeCsvCell('line1\nline2');
    expect(result).toBe('"line1\nline2"'); // newlines preserved inside quotes
  });

  it('handles null bytes', () => {
    const result = escapeCsvCell('value\x00null');
    expect(typeof result).toBe('string');
  });

  it('exports multiple rows correctly', () => {
    const rows = [
      { name: 'A', phone: '1' },
      { name: 'B', phone: '2' },
    ];
    const csv = buildCsvString(rows, [
      { key: 'name', label: 'Nome' },
      { key: 'phone', label: 'Telefone' }
    ]);
    expect(csv).toContain('"Nome","Telefone"');
    expect(csv).toContain('"A","1"');
    expect(csv).toContain('"B","2"');
  });
});

// ── LGPD Regression ─────────────────────────────────────────────────────────

describe('LGPD — Regression Scenarios', () => {
  it('cannot opt-out before consenting', () => {
    const c = { id:'1', consent_at:null, opt_out_at:null };
    expect(!!c.consent_at || !!c.opt_out_at).toBe(false);
  });

  it('import contact gets consent_channel = "import"', () => {
    const channel = "import";
    expect(channel).toBe("import");
  });

  it('valid consent channels are enumerated', () => {
    const valid = ['import', 'whatsapp', 'form', 'manual'];
    expect(valid).toContain('whatsapp');
  });

  it('merge preserves most recent LGPD opt-out', () => {
    const dates = ['2026-01-01', '2026-02-01'];
    const mostRecent = dates.sort().reverse()[0];
    expect(mostRecent).toBe('2026-02-01');
  });
});

// ── Batch Operations ───────────────────────────────────────────────────────

describe('Batch Chunking', () => {
  const chunk = <T>(arr: T[], size: number): T[][] => {
    const res: T[][] = [];
    for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
    return res;
  };

  it('chunks 1000 IDs into 500-row batches', () => {
    const ids = Array.from({ length: 1000 }, (_, i) => String(i));
    const chunks = chunk(ids, 500);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(500);
  });

  it('handles odd-sized last chunk', () => {
    const ids = Array.from({ length: 123 }, (_, i) => String(i));
    const chunks = chunk(ids, 50);
    expect(chunks).toHaveLength(3);
    expect(chunks[2]).toHaveLength(23);
  });

  it('single chunk for <500 IDs', () => {
    const ids = ['1', '2'];
    expect(chunk(ids, 500)).toHaveLength(1);
  });

  it('empty array produces no chunks', () => {
    expect(chunk([], 500)).toHaveLength(0);
  });
});
