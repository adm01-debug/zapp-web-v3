import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';

const IGNORED_DIRS = ['node_modules', '.git', 'dist', '.workspace'];
const IGNORED_FILES = ['ds-config.ts', 'check-design-system.ts'];

const TECHNICAL_CONTEXT_REGEX = /\b(ids?|uuid|timestamp|date|created_at|updated_at|logs?|metrics?|counts?|phone|cnpj|cpf|values?|prices?|amounts?|charts?|graphs?|axis|ticks?|tokens?|hex|hash|sha|vers?|versions?|v\d+|métrica|valor|preço|gráfico|eixo|versão)\b|%/i;

function shouldFixFontMono(line: string, fileName: string): boolean {
  if (TECHNICAL_CONTEXT_REGEX.test(line)) return false;
  if (/chart\.tsx|graph\.tsx|metrics?\.tsx|log\.tsx/i.test(fileName)) return false;
  if (/<(code|pre|samp|kbd)\b/i.test(line)) return false;
  return true;
}

function auditFile(filePath: string) {
  const content = readFileSync(filePath, 'utf-8');
  let newContent = content;
  let changed = false;

  // Fix font-sans: always redundant
  if (newContent.includes('font-sans')) {
    // Basic replacement for font-sans (ignoring complex variants for this specific script)
    const regex = /(?<![\w-])font-sans(?![\w-])/g;
    const matches = newContent.match(regex);
    if (matches) {
       newContent = newContent.replace(regex, '');
       changed = true;
    }
  }

  // Fix font-mono: only if NOT technical
  if (newContent.includes('font-mono')) {
    const lines = newContent.split('\n');
    const updatedLines = lines.map(line => {
      if (line.includes('font-mono') && shouldFixFontMono(line, filePath)) {
        return line.replace(/(?<![\w-])font-mono(?![\w-])/g, '');
      }
      return line;
    });
    const joined = updatedLines.join('\n');
    if (joined !== newContent) {
      newContent = joined;
      changed = true;
    }
  }
  
  // Cleanup extra spaces in className
  if (changed) {
    newContent = newContent.replace(/className=(["'])\s+/g, 'className=$1');
    newContent = newContent.replace(/\s+(["'])(?=\s*\/?>|\s*\))/g, '$1');
    newContent = newContent.replace(/\s{2,}/g, ' ');
    writeFileSync(filePath, newContent);
    console.log(`✅ Updated ${filePath}`);
  }
}

function walk(dir: string) {
  const files = readdirSync(dir);
  for (const file of files) {
    const path = join(dir, file);
    if (IGNORED_DIRS.some(d => path.includes(d))) continue;
    if (statSync(path).isDirectory()) {
      walk(path);
    } else if (['.tsx', '.ts', '.css'].includes(extname(file)) && !IGNORED_FILES.includes(file)) {
      auditFile(path);
    }
  }
}

console.log('🚀 Starting font audit...');
walk('./src');
console.log('✨ Audit complete.');
