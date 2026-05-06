import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const FORBIDDEN_PATTERNS = [
  /#[0-9a-fA-F]{3,6}/, // Hex colors
  /bg-\[(#[0-9a-fA-F]+|rgb|hsl)/, // Arbitrary bg colors
  /text-\[(#[0-9a-fA-F]+|rgb|hsl)/, // Arbitrary text colors
  /border-\[(#[0-9a-fA-F]+|rgb|hsl)/, // Arbitrary border colors
  /bg-(white|black|red|blue|green|yellow|slate|gray|zinc|neutral|stone|orange|amber|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-[0-9]+/, // Literal colors
  /font-(inter|sans|mono|serif)/, // Literal font families if they should be tokens
];

const IGNORED_FILES = [
  'DesignSystem.tsx', // Docs are allowed to show examples
  'tailwind.config.ts',
  'index.css',
];

const IGNORED_DIRS = [
  'node_modules',
  '.git',
  'dist',
];

function scanDir(dir: string, results: { file: string; line: number; match: string }[]) {
  const files = readdirSync(dir);

  for (const file of files) {
    const fullPath = join(dir, file);
    
    if (IGNORED_DIRS.some(d => fullPath.includes(d))) continue;
    if (statSync(fullPath).isDirectory()) {
      scanDir(fullPath, results);
      continue;
    }

    if (IGNORED_FILES.includes(file)) continue;
    if (!['.tsx', '.ts', '.css'].includes(extname(file))) continue;

    const content = readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      FORBIDDEN_PATTERNS.forEach(pattern => {
        const match = line.match(pattern);
        if (match && !line.includes('// @ds-ignore')) {
          results.push({
            file: fullPath,
            line: index + 1,
            match: match[0]
          });
        }
      });
    });
  }
}

const violations: { file: string; line: number; match: string }[] = [];
scanDir('./src', violations);

if (violations.length > 0) {
  console.error(`\x1b[31mFound ${violations.length} Design System violations:\x1b[0m\n`);
  violations.forEach(v => {
    console.error(`  \x1b[33m${v.file}:${v.line}\x1b[0m - Found hardcoded value: \x1b[31m${v.match}\x1b[0m`);
  });
  process.exit(1);
} else {
  console.log('\x1b[32m✅ No Design System violations found!\x1b[0m');
}
