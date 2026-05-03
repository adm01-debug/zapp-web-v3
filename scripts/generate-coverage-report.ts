import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

/**
 * Script para gerar relatório de cobertura comparativo
 * E2E (Playwright) vs Unitário (Vitest)
 */

const CHAT_DOMAIN_PATH = 'src/features/inbox/components/chat';
const E2E_PATH = 'e2e';

function getFiles(dir: string, allFiles: string[] = []) {
  const files = readdirSync(dir);
  for (const file of files) {
    const name = join(dir, file);
    if (statSync(name).isDirectory()) {
      getFiles(name, allFiles);
    } else {
      allFiles.push(name);
    }
  }
  return allFiles;
}

const sourceFiles = getFiles(CHAT_DOMAIN_PATH).filter(f => extname(f) === '.tsx' || (extname(f) === '.ts' && !f.includes('.test.')));
const e2eFiles = readdirSync(E2E_PATH).filter(f => f.includes('.spec.ts'));

console.log('# Relatório de Cobertura Automático - Módulo Chat');
console.log(`Data: ${new Date().toLocaleDateString('pt-BR')}\n`);

console.log('## 📂 Arquivos de Origem Analisados');
sourceFiles.forEach(f => console.log(`- ${f}`));

console.log('\n## 🧪 Cobertura E2E (Playwright)');
e2eFiles.forEach(f => {
  const content = readFileSync(join(E2E_PATH, f), 'utf-8');
  const tests = (content.match(/test\(/g) || []).length;
  console.log(`- **${f}**: ${tests} cenários testados`);
});

console.log('\n## ⚠️ Gaps de Cobertura Identificados');
const untestedFiles = sourceFiles.filter(f => {
  const baseName = f.split('/').pop()?.replace('.tsx', '').replace('.ts', '');
  const hasUnitTest = sourceFiles.some(sf => sf.includes(`${baseName}.test.`));
  const hasE2E = e2eFiles.some(ef => ef.toLowerCase().includes(baseName?.toLowerCase() || ''));
  return !hasUnitTest && !hasE2E;
});

if (untestedFiles.length > 0) {
  untestedFiles.forEach(f => console.log(`- [ ] ${f} (Sem testes unitários ou E2E específicos)`));
} else {
  console.log('✅ Todos os componentes principais possuem algum nível de cobertura.');
}

console.log('\n## 📊 Resumo');
console.log(`- Total de Componentes: ${sourceFiles.length}`);
console.log(`- Total de Suítes E2E: ${e2eFiles.length}`);
console.log(`- Cobertura Estimada: ${Math.round(((sourceFiles.length - untestedFiles.length) / sourceFiles.length) * 100)}%`);
