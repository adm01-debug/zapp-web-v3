import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC_DIR = join(process.cwd(), 'src');
const FEATURES_DIR = join(SRC_DIR, 'features');

// Regex mais preciso que termina no fechamento da string de importação
const DEEP_IMPORT_PATTERN = /from ['"](@\/features\/[^/'"]+\/[^'"]+|src\/features\/[^/'"]+\/[^'"]+)['"]/g;

let totalErrors = 0;

function walk(dir: string, callback: (path: string) => void) {
  const files = readdirSync(dir);
  for (const file of files) {
    const path = join(dir, file);
    if (statSync(path).isDirectory()) {
      walk(path, callback);
    } else if (path.endsWith('.ts') || path.endsWith('.tsx')) {
      callback(path);
    }
  }
}

console.log('🔍 Iniciando auditoria de barreiras de domínio (Domain Boundaries)...');

walk(FEATURES_DIR, (filePath) => {
  const content = readFileSync(filePath, 'utf-8');
  const relPath = relative(process.cwd(), filePath);
  
  const featureMatch = filePath.match(/src\/features\/([^/]+)/);
  if (!featureMatch) return;
  const currentFeature = featureMatch[1];

  let match;
  while ((match = DEEP_IMPORT_PATTERN.exec(content)) !== null) {
    const importPath = match[1];
    const importedFeatureMatch = importPath.match(/(?:@\/features\/|src\/features\/)([^/]+)/);
    if (!importedFeatureMatch) continue;
    const importedFeature = importedFeatureMatch[1];

    if (currentFeature !== importedFeature) {
      const isEntryPoint = importPath === `@/features/${importedFeature}` || 
                          importPath === `src/features/${importedFeature}` ||
                          importPath === `@/features/${importedFeature}/index` ||
                          importPath === `src/features/${importedFeature}/index`;

      if (!isEntryPoint) {
        console.error(`❌ Erro em ${relPath}:`);
        console.error(`   Importação profunda detectada: "${importPath}"`);
        console.error(`   Acesse a feature "${importedFeature}" apenas via seu barrel principal (@/features/${importedFeature}).`);
        console.log('');
        totalErrors++;
      }
    }
  }
});

if (totalErrors > 0) {
  console.error(`🚨 Falha na verificação: ${totalErrors} violações de domínio encontradas.`);
  process.exit(1);
} else {
  console.log('✅ Sucesso! Todas as importações respeitam as barreiras de domínio.');
  process.exit(0);
}
