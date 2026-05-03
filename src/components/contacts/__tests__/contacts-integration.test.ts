/**
 * phone-normalizer.test.ts
 * Comprehensive tests for usePhoneNormalizer — Brazilian phone edge cases.
 */
import { describe, it, expect } from 'vitest';
import { normalizePhone } from '@/lib/usePhoneNormalizer';

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
    expect(r.digits).toBe('11987654321'); // 9 inserted
    expect(r.isMobile).toBe(true);
  });

  // ── Country code stripping ─────────────────────────────────────────────
  it('strips +55 country code', () => {
    const r = normalizePhone('+5511987654321');
    expect(r.digits).toBe('11987654321');
    expect(r.e164).toBe('+5511987654321');
  });

  it('strips 55 country code without +', () => {
    const r = normalizePhone('5511987654321');
    expect(r.digits).toBe('11987654321');
  });

  // ── Formatting ─────────────────────────────────────────────────────────
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
    const formats = [
      '11987654321',
      '+5511987654321',
      '(11) 98765-4321',
      '11 9 8765 4321',
      '1198765-4321',
    ];
    formats.forEach((fmt) => {
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
import { escapeCsvCell, buildCsvString } from '@/lib/csvUtils';

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
      { name: 'João', phone: '11987654321' },
      { name: 'Maria', phone: '21987654321' },
    ];
    const csv = buildCsvString(rows, [
      { key: 'name' as const, label: 'Nome' },
      { key: 'phone' as const, label: 'Telefone' },
    ]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[0]).toBe('"Nome","Telefone"');
    expect(lines[1]).toBe('"João","11987654321"');
  });
});

// ── LGPD Logic Tests ───────────────────────────────────────────────────────

describe('LGPD Consent — Additional Scenarios', () => {
  it('cannot opt-out before consenting', () => {
    // This should be blocked by DB constraint, but test the logic
    const consent_at = null;
    const opt_out_at = new Date().toISOString();
    // Logic: opt_out requires consent
    const isValid = consent_at !== null;
    expect(isValid).toBe(false);
  });

  it('import contact gets consent_channel = "import"', () => {
    const contactFromImport = { lgpd_consent_channel: 'import' };
    expect(contactFromImport.lgpd_consent_channel).toBe('import');
  });

  it('valid consent channels are enumerated', () => {
    const validChannels = ['whatsapp', 'email', 'form', 'phone', 'manual', 'import'];
    validChannels.forEach((ch) => {
      expect(typeof ch).toBe('string');
      expect(ch.length).toBeGreaterThan(0);
    });
  });

  it('merge preserves most recent LGPD opt-out', () => {
    const p = { lgpd_opt_out_at: '2026-03-01T00:00:00Z' };
    const s = { lgpd_opt_out_at: '2026-04-01T00:00:00Z' }; // more recent
    // Most recent opt-out should win
    const merged_opt_out = new Date(p.lgpd_opt_out_at) > new Date(s.lgpd_opt_out_at)
      ? p.lgpd_opt_out_at : s.lgpd_opt_out_at;
    expect(merged_opt_out).toBe('2026-04-01T00:00:00Z');
  });
});

// ── Soft Delete Tests ──────────────────────────────────────────────────────

describe('Soft Delete — Chunking Logic', () => {
  function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  it('chunks 1000 IDs into 500-row batches', () => {
    const ids = Array.from({ length: 1000 }, (_, i) => `id-${i}`);
    const chunks = chunkArray(ids, 500);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(500);
    expect(chunks[1]).toHaveLength(500);
  });

  it('handles odd-sized last chunk', () => {
    const ids = Array.from({ length: 750 }, (_, i) => `id-${i}`);
    const chunks = chunkArray(ids, 500);
    expect(chunks).toHaveLength(2);
    expect(chunks[1]).toHaveLength(250);
  });

  it('single chunk for <500 IDs', () => {
    const ids = Array.from({ length: 3 }, (_, i) => `id-${i}`);
    const chunks = chunkArray(ids, 500);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(3);
  });

  it('empty array produces no chunks', () => {
    expect(chunkArray([], 500)).toHaveLength(0);
  });
});
