import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { WHITELIST } from './ds-config';

const FORBIDDEN_PATTERNS = [
  { pattern: /#([0-9a-fA-F]{3,6})\b/, label: 'Hex Color' },
  { pattern: /bg-\[(#(?:[0-9a-fA-F]{3,6})|rgb|hsl|rgba|hsla)/, label: 'Arbitrary BG' },
  { pattern: /text-\[(#(?:[0-9a-fA-F]{3,6})|rgb|hsl|rgba|hsla)/, label: 'Arbitrary Text' },
  { pattern: /border-\[(#(?:[0-9a-fA-F]{3,6})|rgb|hsl|rgba|hsla)/, label: 'Arbitrary Border' },
  { pattern: /\b(bg|text|border)-(white|black|red|blue|green|yellow|slate|gray|zinc|neutral|stone|orange|amber|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-[0-9]+\b/, label: 'Literal Color' },
  { pattern: /\bfont-(inter|sans|mono|serif)\b/, label: 'Literal Font' },
];

const IGNORED_FILES = [
  'DesignSystem.tsx',
  'tailwind.config.ts',
  'index.css',
  'check-design-system.ts',
  'App.css',
  'DesignSystem.stories.tsx',
  'ds-config.ts',
];

const IGNORED_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'stories',
  '__tests__',
];

interface Violation {
  file: string;
  line: number;
  match: string;
  label: string;
  suggestion?: string;
  priority: 'High' | 'Medium' | 'Low';
}

function getSuggestion(label: string, match: string): { suggestion: string, priority: Violation['priority'] } {
  if (label === 'Hex Color' || label.includes('Arbitrary')) {
    if (match.includes('white') || match.includes('#ffffff') || match.includes('#FFF')) return { suggestion: 'bg-background or text-foreground', priority: 'High' };
    if (match.includes('black') || match.includes('#000000') || match.includes('#000')) return { suggestion: 'bg-foreground or text-background', priority: 'High' };
    return { suggestion: 'Use theme tokens (primary, secondary, accent, etc.)', priority: 'High' };
  }
  if (label === 'Literal Color') {
    const isAllowed = WHITELIST.colors.some(c => match.includes(c));
    if (isAllowed) return { suggestion: '', priority: 'Low' };

    if (match.includes('blue-600') || match.includes('blue-500')) return { suggestion: match.replace(/blue-(500|600)/, 'primary'), priority: 'Medium' };
    if (match.includes('slate-') || match.includes('gray-')) return { suggestion: 'muted-foreground or border', priority: 'Medium' };
    return { suggestion: 'Use semantic tokens (destructive, muted, popover, etc.)', priority: 'Medium' };
  }
  if (label === 'Literal Font') {
    return { suggestion: 'Remove literal font class; use global typography', priority: 'Low' };
  }
  return { suggestion: 'Check design system tokens', priority: 'Low' };
}

function scanDir(dir: string, results: Violation[]) {
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

    try {
      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        FORBIDDEN_PATTERNS.forEach(({ pattern, label }) => {
          const matches = line.matchAll(new RegExp(pattern, 'g'));
          for (const match of matches) {
            if (!line.includes('// @ds-ignore')) {
              const { suggestion, priority } = getSuggestion(label, match[0]);
              // For Literal Color, only add if it's NOT in whitelist
              if (label === 'Literal Color' && WHITELIST.colors.some(c => match[0].endsWith(`-${c}`))) continue;
              
              if (suggestion || priority === 'High') {
                results.push({
                  file: fullPath,
                  line: index + 1,
                  match: match[0],
                  label,
                  suggestion,
                  priority
                });
              }
            }
          }
        });
      });
    } catch (e) {
      console.error('Error reading ' + fullPath + ':', e);
    }
  }
}

const violations: Violation[] = [];
scanDir('./src', violations);

// Group by file
const groupedViolations: Record<string, Violation[]> = {};
violations.forEach(v => {
  if (!groupedViolations[v.file]) groupedViolations[v.file] = [];
  groupedViolations[v.file].push(v);
});

// Generate Markdown Report
let mdReport = '# Design System Violations Report\n';
mdReport += 'Generated on: ' + new Date().toLocaleString() + '\n';
mdReport += 'Total Violations: ' + violations.length + '\n\n';

Object.entries(groupedViolations).forEach(([file, fileViolations]) => {
  mdReport += `## ${file}\n`;
  mdReport += '| Priority | Line | Type | Value | Suggestion |\n';
  mdReport += '|----------|------|------|-------|------------|\n';
  fileViolations.sort((a, b) => {
    const p = { 'High': 0, 'Medium': 1, 'Low': 2 };
    return p[a.priority] - p[b.priority];
  }).forEach(v => {
    mdReport += `| ${v.priority} | ${v.line} | ${v.label} | \`${v.match}\` | ${v.suggestion} |\n`;
  });
  mdReport += '\n';
});

writeFileSync('design-system-audit.md', mdReport);

// Generate HTML Report
const htmlReport = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Design System Audit</title>
    <style>
        body { font-family: -apple-system, system-ui, sans-serif; padding: 2rem; background: #f9fafb; color: #111827; }
        .card { background: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 2rem; }
        h1, h2 { color: #1f2937; }
        h2 { margin-top: 2rem; font-size: 1.1rem; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f3f4f6; font-size: 0.875rem; }
        .priority-High { color: #ef4444; font-weight: bold; }
        .priority-Medium { color: #f59e0b; font-weight: bold; }
        code { background: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-size: 0.875rem; }
        .label { font-size: 0.75rem; padding: 0.1rem 0.4rem; border-radius: 1rem; background: #e5e7eb; }
    </style>
</head>
<body>
    <h1>Design System Audit Report</h1>
    <div class="card">
        <p><strong>Total Violations:</strong> ${violations.length}</p>
        <p><strong>Files Affected:</strong> ${Object.keys(groupedViolations).length}</p>
    </div>

    ${Object.entries(groupedViolations).map(([file, fileViolations]) => `
        <div class="card">
            <h2><code>${file}</code></h2>
            <table>
                <thead>
                    <tr>
                        <th>Priority</th>
                        <th>Line</th>
                        <th>Type</th>
                        <th>Value</th>
                        <th>Suggestion</th>
                    </tr>
                </thead>
                <tbody>
                    ${fileViolations.map(v => `
                        <tr>
                            <td><span class="priority-${v.priority}">${v.priority}</span></td>
                            <td>${v.line}</td>
                            <td><span class="label">${v.label}</span></td>
                            <td><code>${v.match}</code></td>
                            <td><em>${v.suggestion}</em></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `).join('')}
</body>
</html>`;

writeFileSync('design-system-audit.html', htmlReport);

if (process.argv.includes('--ci')) {
  if (violations.length > 0) {
    process.stderr.write(`❌ ERROR: Found ${violations.length} violations across ${Object.keys(groupedViolations).length} files.\n`);
    process.exit(1);
  }
}


