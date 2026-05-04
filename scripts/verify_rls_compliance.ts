import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const migrationsDir = 'supabase/migrations';
const tablesFound: Set<string> = new Set();
const rlsEnabled: Set<string> = new Set();
const policiesFound: Map<string, string[]> = new Map();

// 1. Scan migrations for table creations and RLS commands
const migrationFiles = fs.readdirSync(migrationsDir).sort();
migrationFiles.forEach(file => {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
  
  // Find tables
  const tableMatches = content.matchAll(/CREATE TABLE (?:public\.)?(\w+)/gi);
  for (const match of tableMatches) tablesFound.add(match[1]);

  // Find RLS enabled
  const rlsMatches = content.matchAll(/ALTER TABLE (?:public\.)?(\w+) ENABLE ROW LEVEL SECURITY/gi);
  for (const match of rlsMatches) rlsEnabled.add(match[1]);

  // Find policies
  const policyMatches = content.matchAll(/CREATE POLICY "(.+?)" ON (?:public\.)?(\w+)/gi);
  for (const match of policyMatches) {
    const [_, policyName, tableName] = match;
    if (!policiesFound.has(tableName)) policiesFound.set(tableName, []);
    policiesFound.get(tableName)!.push(policyName);
  }
});

// 2. Generate Report
console.log("# Relatório de Conformidade RLS Automático\n");
console.log("| Tabela | RLS Habilitado | Políticas Encontradas | Status |");
console.log("| :--- | :--- | :--- | :--- |");

tablesFound.forEach(table => {
  const isEnabled = rlsEnabled.has(table);
  const policies = policiesFound.get(table) || [];
  const status = (isEnabled && policies.length > 0) ? "✅ Seguro" : "❌ Vulnerável";
  console.log(\`| \${table} | \${isEnabled ? "Sim" : "Não"} | \${policies.join(", ") || "Nenhuma"} | \${status} |\`);
});
