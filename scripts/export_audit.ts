import * as fs from 'fs';
import * as path from 'path';

/**
 * Script para exportar o inventário de auditoria filtrado por módulo ou status.
 * Uso: bun scripts/export_audit.ts --module=Inbox --status=Implementado
 */

const auditFilePath = path.resolve(process.cwd(), 'docs/audit/ENTERPRISE_AUDIT_REPORT_V6.md');

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

console.log(`# Inventory Export - ${new Date().toLocaleDateString()}`);
console.log(`> Filters: ${filters.module || 'All'} | ${filters.status || 'All'}\n`);

// Index (TOC)
console.log(`## Index`);
console.log(`1. [Executive Summary](#executive-summary)`);
console.log(`2. [Inventory](#module-inventory--status)`);
console.log(`3. [Risk Matrix](#risk-matrix--lgpd-controls)`);
console.log(`4. [Audit Trail](#operational-audit-trail-evidence-genesis)\n`);

const lines = content.split('\n');
const resultLines: string[] = [];
let inTable = false;

lines.forEach(line => {
  if (line.includes('|')) {
    const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
    
    if (line.includes('---')) {
       resultLines.push(line);
       return;
    }
    
    if (!inTable) {
      inTable = true;
      resultLines.push(line);
      return;
    }

    const matchesModule = !filters.module || cells.some(c => c.toLowerCase().includes(filters.module!));
    const matchesStatus = !filters.status || cells.some(c => c.toLowerCase().includes(filters.status!));

    if (matchesModule && matchesStatus) {
      resultLines.push(line);
    }
  } else {
    if (inTable) inTable = false;
    if (line.startsWith('#')) {
      resultLines.push(line);
    } else if (!filters.module && !filters.status) {
      resultLines.push(line);
    }
  }
});

const output = resultLines.join('\n');
console.log(output);

if (args.includes('--save')) {
  const outputPath = `docs/audit/inventory_export_${filters.module || 'all'}.md`;
  fs.writeFileSync(outputPath, output);
  console.log(`\nExport saved to: ${outputPath}`);
}
