import * as fs from 'fs';
import * as path from 'path';

/**
 * Script para exportar o inventário de auditoria filtrado por módulo ou status.
 * Uso: bun scripts/export_audit.ts --module=Inbox --status=Implementado
 */

const auditFilePath = path.resolve(process.cwd(), 'docs/audit/DOSSIA_AUDITORIA_ENTERPRISE_V5.md');

if (!fs.existsSync(auditFilePath)) {
  console.error(`Arquivo não encontrado: ${auditFilePath}`);
  process.exit(1);
}

const content = fs.readFileSync(auditFilePath, 'utf-8');
const args = process.argv.slice(2);
const filters = {
  module: args.find(a => a.startsWith('--module='))?.split('=')[1]?.toLowerCase(),
  status: args.find(a => a.startsWith('--status='))?.split('=')[1]?.toLowerCase()
};

console.log(`--- Exportação de Auditoria Enterprise ---`);
console.log(`Filtros Aplicados: ${JSON.stringify(filters)}\n`);

// Parse tables in the MD
const lines = content.split('\n');
const resultLines: string[] = [];
let inTable = false;
let tableHeaders: string[] = [];

lines.forEach(line => {
  if (line.includes('|')) {
    const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
    
    // Check if it's a header or separator
    if (line.includes('---')) return;
    
    if (!inTable) {
      inTable = true;
      tableHeaders = cells;
      resultLines.push(line);
      return;
    }

    // Filter logic for rows
    const matchesModule = !filters.module || cells.some(c => c.toLowerCase().includes(filters.module!));
    const matchesStatus = !filters.status || cells.some(c => c.toLowerCase().includes(filters.status!));

    if (matchesModule && matchesStatus) {
      resultLines.push(line);
    }
  } else {
    if (inTable) {
      inTable = false;
      resultLines.push('\n');
    }
    // Keep headers and executive summary if no specific filters or if it's a heading
    if (!filters.module && !filters.status) {
      resultLines.push(line);
    } else if (line.startsWith('#')) {
      resultLines.push(line);
    }
  }
});

const output = resultLines.join('\n');
console.log(output);

// Optionally save to a file
if (args.includes('--save')) {
  const outputPath = `docs/audit/audit_export_${Date.now()}.md`;
  fs.writeFileSync(outputPath, output);
  console.log(`\nExportação salva em: ${outputPath}`);
}
