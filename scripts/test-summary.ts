import fs from 'fs';
import path from 'path';

async function generateSummary() {
  const coveragePath = path.resolve(process.cwd(), 'coverage/index.html');
  const e2eResults = path.resolve(process.cwd(), 'playwright-report/index.html');
  
  console.log('--- RELATÓRIO DE QUALIDADE ---');
  console.log(`Vitest Coverage: ${fs.existsSync(coveragePath) ? '✅ Disponível' : '❌ Não gerado'}`);
  console.log(`Playwright Results: ${fs.existsSync(e2eResults) ? '✅ Disponível' : '❌ Não gerado'}`);
  console.log('------------------------------');
}

generateSummary();
