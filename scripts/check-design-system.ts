import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'fs';
import { join, extname, relative } from 'path';
import { DS_CONFIG } from './ds-config';

const { WHITELIST, VARIANTS, FORBIDDEN_PATTERNS } = DS_CONFIG;

const IGNORED_FILES = [
  'DesignSystem.tsx',
  'tailwind.config.ts',
  'index.css',
  'check-design-system.ts',
  'ds-config.ts',
  'test-audit.ts'
];

const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'stories', '__tests__', '.workspace'];

interface Violation {
  file: string;
  line: number;
  match: string;
  cleanMatch: string;
  prefix: string;
  label: string;
  suggestion?: string;
  replacement?: string;
  priority: 'High' | 'Medium' | 'Low';
}

const variantPrefixRegex = new RegExp(`^(?:(?:${VARIANTS.join('|')}):)+`, 'g');

function getSuggestion(label: string, match: string): { suggestion: string, priority: Violation['priority'], replacement?: string, cleanMatch: string, prefix: string } {
  const prefixMatch = match.match(variantPrefixRegex);
  const prefix = prefixMatch ? prefixMatch[0] : '';
  const cleanMatch = match.replace(variantPrefixRegex, '').trim();

  if (label === 'Raw Hex' || label === 'Arbitrary Color') {
    const lowerClean = cleanMatch.toLowerCase();
    const isWhite = lowerClean.includes('white') || lowerClean.includes('#ffffff') || lowerClean.includes('#fff');
    const isBlack = lowerClean.includes('black') || lowerClean.includes('#000000') || lowerClean.includes('#000');
    
    if (isWhite) {
       const baseReplacement = cleanMatch.startsWith('bg-') ? 'bg-background' : (cleanMatch.startsWith('text-') ? 'text-foreground' : (cleanMatch.startsWith('border-') ? 'border-border' : undefined));
       const replacement = baseReplacement ? `${prefix}${baseReplacement}` : undefined;
       return { cleanMatch, prefix, suggestion: `${prefix}bg-background or ${prefix}text-foreground`, priority: 'High', replacement };
    }
    if (isBlack) {
       const baseReplacement = cleanMatch.startsWith('bg-') ? 'bg-foreground' : (cleanMatch.startsWith('text-') ? 'text-background' : undefined);
       const replacement = baseReplacement ? `${prefix}${baseReplacement}` : undefined;
       return { cleanMatch, prefix, suggestion: `${prefix}bg-foreground or ${prefix}text-background`, priority: 'High', replacement };
    }
    return { cleanMatch, prefix, suggestion: 'Use theme tokens (primary, secondary, accent, etc.)', priority: 'High' };
  }

  if (label === 'Literal Color') {
    if (WHITELIST.colors.some(c => cleanMatch.endsWith(`-${c}`))) return { cleanMatch, prefix, suggestion: '', priority: 'Low' };

    if (cleanMatch.includes('blue-600') || cleanMatch.includes('blue-500')) {
      const replacement = `${prefix}${cleanMatch.replace(/blue-(500|600)/, 'primary')}`;
      return { cleanMatch, prefix, suggestion: replacement, priority: 'Medium', replacement };
    }
    if (cleanMatch.includes('slate-') || cleanMatch.includes('gray-')) {
       const baseReplacement = cleanMatch.includes('bg-') ? 'bg-muted' : (cleanMatch.includes('text-') ? 'text-muted-foreground' : (cleanMatch.includes('border-') ? 'border-border' : undefined));
       const replacement = baseReplacement ? `${prefix}${baseReplacement}` : undefined;
       return { cleanMatch, prefix, suggestion: 'muted, muted-foreground or border', priority: 'Medium', replacement };
    }
    return { cleanMatch, prefix, suggestion: 'Use semantic tokens (destructive, muted, popover, etc.)', priority: 'Medium' };
  }

  if (label === 'Literal Font') {
    return { cleanMatch, prefix, suggestion: 'Remove literal font class; use global typography', priority: 'Low' };
  }
  return { cleanMatch, prefix, suggestion: 'Check design system tokens', priority: 'Low' };
}

function scanDir(dir: string, results: Violation[]) {
  if (!existsSync(dir)) return;
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
      if (line.includes('@ds-ignore')) return;

      FORBIDDEN_PATTERNS.forEach(({ pattern, label }) => {
        const variantsPart = `(?:(?:${VARIANTS.join('|')}):)*`;
        // Match word-like chunks without lookbehind
        const fullPattern = new RegExp(`${variantsPart}${pattern.source}`, 'g');
        const matches = line.matchAll(fullPattern);
        
        for (const match of matches) {
          const rawMatch = match[0].trim();
          if (!rawMatch) continue;

          const { suggestion, priority, replacement, cleanMatch, prefix } = getSuggestion(label, rawMatch);
          
          if (label === 'Literal Color' && WHITELIST.colors.some(c => cleanMatch.endsWith(`-${c}`))) continue;
          
          if (suggestion || priority === 'High') {
            results.push({
              file: relative(process.cwd(), fullPath),
              line: index + 1,
              match: rawMatch,
              cleanMatch,
              prefix,
              label,
              suggestion,
              replacement,
              priority
            });
          }
        }
      });
    });
  }
}

const violations: Violation[] = [];
scanDir('./src', violations);

// Generate Reports
const groupedViolations: Record<string, Violation[]> = {};
violations.forEach(v => {
  if (!groupedViolations[v.file]) groupedViolations[v.file] = [];
  groupedViolations[v.file].push(v);
});

// Markdown Report
let mdReport = `# Design System Audit\nGenerated on: ${new Date().toLocaleString()}\n\n`;
Object.entries(groupedViolations).forEach(([file, fileViolations]) => {
  mdReport += `## ${file}\n| Priority | Line | Type | Match | Clean | Suggestion |\n|---|---|---|---|---|---|\n`;
  fileViolations.forEach(v => {
    mdReport += `| ${v.priority} | ${v.line} | ${v.label} | \`${v.match}\` | \`${v.cleanMatch}\` | ${v.suggestion} |\n`;
  });
  mdReport += '\n';
});
writeFileSync('design-system-audit.md', mdReport);

// HTML Report
const htmlReport = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; padding: 20px; background: #f4f4f5; }
    .card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #e4e4e7; }
    .high { color: #ef4444; font-weight: bold; }
    code { background: #f1f1f1; padding: 2px 4px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Design System Audit</h1>
  ${Object.entries(groupedViolations).map(([file, fileViolations]) => `
    <div class="card">
      <h3>${file}</h3>
      <table>
        <thead><tr><th>Priority</th><th>Line</th><th>Match</th><th>Suggestion</th></tr></thead>
        <tbody>
          ${fileViolations.map(v => `
            <tr>
              <td class="${v.priority.toLowerCase()}">${v.priority}</td>
              <td>${v.line}</td>
              <td><code>${v.match}</code></td>
              <td>${v.suggestion}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('')}
</body>
</html>
`;
writeFileSync('design-system-audit.html', htmlReport);

if (process.argv.includes('--apply-patch')) {
  Object.entries(groupedViolations).forEach(([file, fileViolations]) => {
    let lines = readFileSync(file, 'utf-8').split('\n');
    let hasChanges = false;
    fileViolations.forEach(v => {
      if (v.replacement && lines[v.line-1].includes(v.match)) {
        lines[v.line-1] = lines[v.line-1].replace(v.match, v.replacement);
        hasChanges = true;
      }
    });
    if (hasChanges) writeFileSync(file, lines.join('\n'));
  });
  console.log('✅ Applied patches.');
}

if (process.argv.includes('--ci') && violations.length > 0) {
  console.error(`❌ Found ${violations.length} violations.`);
  process.exit(1);
}
