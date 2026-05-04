import fs from 'fs';
import path from 'path';

const migrationsDir = 'supabase/migrations';
const tablesFound = new Set();
const rlsEnabled = new Set();
const policiesFound = new Map();

const migrationFiles = fs.readdirSync(migrationsDir).sort();
migrationFiles.forEach(file => {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
  
  const tableMatches = content.matchAll(/CREATE TABLE (?:public\.)?(\w+)/gi);
  for (const match of tableMatches) tablesFound.add(match[1]);

  const rlsMatches = content.matchAll(/ALTER TABLE (?:public\.)?(\w+) ENABLE ROW LEVEL SECURITY/gi);
  for (const match of rlsMatches) rlsEnabled.add(match[1]);

  const policyMatches = content.matchAll(/CREATE POLICY "(.+?)" ON (?:public\.)?(\w+)/gi);
  for (const match of policyMatches) {
    const [_, policyName, tableName] = match;
    if (!policiesFound.has(tableName)) policiesFound.set(tableName, []);
    policiesFound.get(tableName).push(policyName);
  }
});

process.stdout.write("# Relatório de Conformidade RLS Automático\n\n");
process.stdout.write("| Tabela | RLS Habilitado | Políticas Encontradas | Status |\n");
process.stdout.write("| :--- | :--- | :--- | :--- |\n");

tablesFound.forEach(table => {
  const isEnabled = rlsEnabled.has(table);
  const policies = policiesFound.get(table) || [];
  const status = (isEnabled && policies.length > 0) ? "✅ Seguro" : "❌ Vulnerável";
  process.stdout.write("| " + table + " | " + (isEnabled ? "Sim" : "Não") + " | " + (policies.join(", ") || "Nenhuma") + " | " + status + " |\n");
});
