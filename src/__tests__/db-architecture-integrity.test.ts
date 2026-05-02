import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { globSync } from 'glob';

/**
 * ZAPP WEB — Arquitetura de Dados (v2.0)
 * 
 * Este teste garante que NENHUMA migration no Lovable Supabase crie tabelas evolution_*.
 * O domínio evolution_* reside EXCLUSIVAMENTE no banco self-hosted (FATOR X).
 */
describe('Database Architecture Integrity: No evolution_* in Lovable Cloud', () => {
  it('should not contain any migrations creating evolution_* tables', () => {
    const migrationFiles = globSync('supabase/migrations/*.sql');
    
    const forbiddenPatterns = [
      /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?public\.evolution_(contacts|messages|conversations|calls|deals|groups|tags|media|tasks|automations|settings|audit_log)/i,
      /ALTER\s+TABLE\s+public\.evolution_/i,
      /CREATE\s+INDEX\s+.*ON\s+public\.evolution_/i
    ];

    // Tabelas de controle local (telemetria/idempotência) SÃO permitidas no Lovable Cloud.
    const allowedTablePrefixes = [
      'evolution_webhook_events',
      'evolution_retry_metrics',
      'evolution_send_idempotency',
      'evolution_fallback_events',
      'evolution_incidents'
    ];

    const violations: string[] = [];

    migrationFiles.forEach(file => {
      const content = readFileSync(file, 'utf-8');
      
      forbiddenPatterns.forEach(pattern => {
        // Use global flag to find all occurrences
        const globalPattern = new RegExp(pattern.source, 'gi');
        const matches = content.match(globalPattern);
        if (matches) {
          matches.forEach(match => {
            // Extract table name from pattern like "ALTER TABLE public.evolution_contacts"
            const parts = match.split('.');
            const afterDot = parts.length > 1 ? parts[1] : parts[0];
            const tableName = afterDot.split(/[ \n\r\t(]/)[0];
            
            if (!allowedTablePrefixes.some(allowed => tableName.startsWith(allowed))) {
              violations.push(`${file}: Found forbidden pattern "${match}" (table: ${tableName})`);
            }
          });
        }
      });
    });

    if (violations.length > 0) {
      console.error('Violations found:\n' + violations.join('\n'));
    }
    
    expect(violations, 'Forbidden evolution_* table creation found in Lovable migrations').toHaveLength(0);
  });
});
