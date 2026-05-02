/**
 * csvUtils.ts — v2.0
 * Safe CSV export utilities with injection prevention (OWASP).
 * RFC4180 compliant, UTF-8 BOM for Excel compatibility.
 *
 * CSV Injection Prevention:
 * Cells starting with =, +, -, @, TAB, CR are prefixed with \t
 * to prevent formula injection in spreadsheet applications.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface ContactExportRow {
  name:             string;
  phone:            string;
  email:            string;
  company:          string;
  tags:             string;
  channel:          string;
  notes:            string;
  created_at:       string;
  last_seen_at:     string;
  lgpd_consent_at:  string;
  [key: string]:    string;
}

export interface CsvColumn<T = Record<string, string>> {
  key:   keyof T;
  label: string;
}

// ── Cell escaping ──────────────────────────────────────────────────────────

/**
 * Escape a single CSV cell value.
 * - Wraps all values in double quotes (RFC4180)
 * - Escapes internal double quotes by doubling them
 * - Neutralizes formula injection prefixes (=, +, -, @, TAB, CR)
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';

  const str = String(value);
  if (!str) return '';

  // Neutralize CSV injection: prefix dangerous characters with TAB
  const DANGEROUS_CHARS = /^[=+\-@\t\r]/;
  const escaped = DANGEROUS_CHARS.test(str) ? `\t${str}` : str;

  // RFC4180: wrap in quotes, escape internal quotes by doubling
  return `"${escaped.replace(/"/g, '""')}"`;
}

// ── CSV Builder ────────────────────────────────────────────────────────────

/**
 * Build a complete CSV string from rows and column definitions.
 * Includes UTF-8 BOM for Excel compatibility.
 */
export function buildCsvString<T extends Record<string, string>>(
  rows:    T[],
  columns: CsvColumn<T>[]
): string {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(',');
  const body = rows.map((row) =>
    columns.map((c) => escapeCsvCell(row[c.key])).join(',')
  ).join('\r\n');

  // UTF-8 BOM (\uFEFF) ensures Excel opens with correct encoding
  return '\uFEFF' + header + '\r\n' + body;
}

// ── Download Trigger ───────────────────────────────────────────────────────

/**
 * Trigger browser download of a CSV file.
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Contact Export Shorthand ───────────────────────────────────────────────

/** Default column definitions for contact exports */
const DEFAULT_CONTACT_COLUMNS: CsvColumn<ContactExportRow>[] = [
  { key: 'name',            label: 'Nome' },
  { key: 'phone',           label: 'Telefone' },
  { key: 'email',           label: 'E-mail' },
  { key: 'company',         label: 'Empresa' },
  { key: 'tags',            label: 'Tags' },
  { key: 'channel',         label: 'Canal' },
  { key: 'notes',           label: 'Notas' },
  { key: 'created_at',      label: 'Criado em' },
  { key: 'last_seen_at',    label: 'Último contato' },
  { key: 'lgpd_consent_at', label: 'Consentimento LGPD' },
];

/**
 * Export contacts to CSV and trigger browser download.
 */
export function exportContactsToCsv(
  rows:     ContactExportRow[],
  columns?: CsvColumn<ContactExportRow>[],
  filename?: string
): void {
  const cols = columns ?? DEFAULT_CONTACT_COLUMNS;
  const csv  = buildCsvString(rows, cols);
  const date = new Date().toISOString().slice(0, 10);
  downloadCsv(csv, filename ?? `contatos-${date}.csv`);
}

// ── CSV Parser ─────────────────────────────────────────────────────────────

/**
 * Parse a CSV file (File object) to an array of objects.
 * Uses first row as headers.
 */
export async function parseCsvFile(file: File): Promise<Array<Record<string, string>>> {
  const text = await file.text();
  // Remove UTF-8 BOM if present
  const clean = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseRow(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseRow(line);
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (cells[i] ?? '').trim()]));
  });
}

/** Parse a single CSV row respecting quoted fields */
function parseRow(row: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') { current += '"'; i++; } // escaped quote
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}
