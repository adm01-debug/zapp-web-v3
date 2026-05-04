import * as fs from 'fs';
import * as path from 'path';

/**
 * Script para exportar partes do inventário de auditoria com filtros.
 * Uso: bun scripts/export_audit.ts --module=Inbox --status=Implementado
 */

const auditFilePath = path.resolve(__dirname, '../docs/audit/enterprise_audit_report.md');
const content = fs.readFileSync(auditFilePath, 'utf-8');

const args = process.argv.slice(2);
const filters = {
  module: args.find(a => a.startsWith('--module='))?.split('=')[1],
  status: args.find(a => a.startsWith('--status='))?.split('=')[1]
};

console.log(`--- Exportando Relatório Filtrado ---`);
console.log(`Filtros: ${JSON.stringify(filters)}\n`);

if (filters.module) {
  const sections = content.split('### Módulo:');
  const targetSection = sections.find(s => s.trim().startsWith(filters.module as string));
  if (targetSection) {
    console.log(`### Módulo: ${targetSection}`);
  } else {
    console.log(`Módulo "${filters.module}" não encontrado.`);
  }
} else {
  console.log(content);
}
