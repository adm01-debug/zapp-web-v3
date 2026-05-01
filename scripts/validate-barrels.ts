import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC_DIR = join(process.cwd(), 'src');
const FEATURES_DIR = join(SRC_DIR, 'features');

let totalErrors = 0;

function walk(dir: string, callback: (path: string) => void) {
  const files = readdirSync(dir);
  for (const file of files) {
    const path = join(dir, file);
    if (statSync(path).isDirectory()) {
      walk(path, callback);
    } else if (file === 'index.ts' || file === 'index.tsx') {
      callback(path);
    }
  }
}

console.log('🔍 Validando integridade dos Barrel Files (index.ts)...');

walk(FEATURES_DIR, (filePath) => {
  const content = readFileSync(filePath, 'utf-8');
  const relPath = relative(process.cwd(), filePath);
  
  // 1. Verificar "export * from './...'" duplicados ou conflitantes
  const lines = content.split('\n');
  const exports = new Set<string>();
  const starExports = new Set<string>();

  for (const line of lines) {
    // Detectar export * from './path'
    const starMatch = line.match(/export\s+\*\s+from\s+['"]\.\/([^'"]+)['"]/);
    if (starMatch) {
      const path = starMatch[1];
      if (starExports.has(path)) {
        console.error(`❌ Erro em ${relPath}:`);
        console.error(`   Exportação duplicada: "export * from './${path}'"`);
        totalErrors++;
      }
      starExports.add(path);
    }

    // 2. Detectar exportações nomeadas que podem conflitar
    // Simplificado: busca por 'export { X }' ou 'export const X' etc.
    const namedMatch = line.match(/export\s+(?:(?:type|interface|const|function|class|enum)\s+([a-zA-Z0-9_]+)|{\s*([^}]+)\s*})/);
    if (namedMatch) {
      const symbols = namedMatch[1] ? [namedMatch[1]] : namedMatch[2].split(',').map(s => s.trim().split(' as ').pop()?.trim());
      for (const symbol of symbols) {
        if (!symbol) continue;
        if (exports.has(symbol)) {
          console.error(`❌ Erro em ${relPath}:`);
          console.error(`   Símbolo duplicado ou em conflito: "${symbol}"`);
          totalErrors++;
        }
        exports.add(symbol);
      }
    }
  }

  // 3. Verificação específica para casos conhecidos de erro (TemplateType, etc)
  if (content.includes('TemplateType') && content.includes('export *')) {
    // Se exporta * e também menciona TemplateType, pode haver ambiguidade se o * também exportar TemplateType
    // Este é um check de aviso preventivo
    // console.log(`⚠️  Aviso em ${relPath}: exportação de "TemplateType" detectada em arquivo com "export *". Verifique se há conflitos.`);
  }
});

if (totalErrors > 0) {
  console.error(`🚨 Falha na validação: ${totalErrors} erros de integridade em barrels encontrados.`);
  process.exit(1);
} else {
  console.log('✅ Sucesso! Todos os Barrel Files parecem íntegros.');
  process.exit(0);
}
