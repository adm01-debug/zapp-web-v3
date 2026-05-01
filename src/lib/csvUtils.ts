/**
 * csvUtils.ts
 * Safe CSV export/import utilities.
 *
 * SECURITY: Prevents CSV Injection (Formula Injection) attacks.
 * Attackers insert formulas like =cmd|'/c calc'!A0 that Excel/Sheets execute.
 * We prefix dangerous characters with a TAB character to neutralize them.
 *
 * OWASP: https://owasp.org/www-community/attacks/CSV_Injection
 */

// ── Injection prevention ───────────────────────────────────────────────────

/** Characters that trigger formula execution in spreadsheet apps */
const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Sanitize a single CSV cell value.
 * - Wraps in double-quotes
 * - Escapes internal double-quotes
 * - Prefixes dangerous formula starters with a tab to neutralize them
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';

  let str = String(value).trim();

  // Neutralize formula injection: prefix with tab if starts with dangerous char
  if (DANGEROUS_PREFIXES.some((c) => str.startsWith(c))) {
    str = `\t${str}`;
  }

  // Escape double-quotes by doubling them (RFC 4180)
  str = str.replace(/"/g, '""');

  // Always quote the cell to handle commas and newlines safely
  return `"${str}"`;
}

/**
 * Build a CSV string from an array of row objects.
 * @param rows     Array of data rows
 * @param columns  Column definitions: key = object property, label = header text
 */
export function buildCsvString<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<{ key: keyof T; label: string }>
): string {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeCsvCell(row[c.key])).join(','))
    .join('\n');

  return `${header}\n${body}`;
}

/**
 * Trigger a browser download of a CSV file.
 * Adds BOM (U+FEFF) so Excel correctly reads UTF-8 with accents.
 */
export function downloadCsv(filename: string, csvContent: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export contacts to a safe CSV file.
 */
export interface ContactExportRow {
  name: string;
  phone: string;
  email: string;
  company: string;
  tags: string;
  channel: string;
  notes: string;
  created_at: string;
  last_seen_at: string;
}

export function exportContactsToCsv(contacts: ContactExportRow[]): void {
  const columns: Array<{ key: keyof ContactExportRow; label: string }> = [
    { key: 'name', label: 'Nome' },
    { key: 'phone', label: 'Telefone' },
    { key: 'email', label: 'E-mail' },
    { key: 'company', label: 'Empresa' },
    { key: 'tags', label: 'Tags' },
    { key: 'channel', label: 'Canal' },
    { key: 'notes', label: 'Notas' },
    { key: 'created_at', label: 'Criado em' },
    { key: 'last_seen_at', label: 'Último contato' },
  ];

  const csv = buildCsvString(contacts, columns);
  const filename = `contatos_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCsv(filename, csv);
}

// ── CSV Parsing ────────────────────────────────────────────────────────────

/**
 * Detect encoding issues in a CSV string (e.g., Windows-1252 garbled as UTF-8).
 * Returns true if the string appears to have encoding issues.
 */
export function hasEncodingIssues(str: string): boolean {
  // Common Windows-1252 → UTF-8 garbled sequences
  const garbledPatterns = /[\uFFFD\u00C3\u00A3\u00C3\u00A7]/;
  return garbledPatterns.test(str) && str.includes('\u00C3');
}

/**
 * Parse a CSV file with robust handling of:
 * - UTF-8 with BOM
 * - Windows-1252 encoding (attempts detection)
 * - Quoted fields with embedded commas and newlines
 * - Empty rows
 */
export async function parseCsvFile(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        reject(new Error('Arquivo vazio ou inválido'));
        return;
      }

      // Strip BOM if present
      const content = text.startsWith('\uFEFF') ? text.slice(1) : text;

      // Warn about encoding issues but continue
      if (hasEncodingIssues(content)) {
        console.warn('[csvUtils] Possível problema de encoding detectado no arquivo CSV.');
      }

      try {
        const rows = parseRawCsv(content);
        resolve(rows);
      } catch (err) {
        reject(new Error(`Erro ao processar CSV: ${String(err)}`));
      }
    };

    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));

    // Try UTF-8 first
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * RFC 4180-compliant CSV parser.
 * Handles quoted fields, embedded commas, and embedded newlines.
 */
function parseRawCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let insideQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];

    if (insideQuotes) {
      if (ch === '"' && next === '"') {
        // Escaped quote
        field += '"';
        i += 2;
      } else if (ch === '"') {
        insideQuotes = false;
        i++;
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        insideQuotes = true;
        i++;
      } else if (ch === ',') {
        row.push(field.trim());
        field = '';
        i++;
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        row.push(field.trim());
        field = '';
        if (row.some((v) => v !== '')) {
          rows.push(row);
        }
        row = [];
        i += ch === '\r' ? 2 : 1;
      } else if (ch === '\r') {
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Last field/row
  if (field || row.length > 0) {
    row.push(field.trim());
    if (row.some((v) => v !== '')) {
      rows.push(row);
    }
  }

  return rows;
}
