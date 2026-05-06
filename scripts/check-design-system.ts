import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { WHITELIST } from './ds-config';

const FORBIDDEN_PATTERNS = [
  { pattern: /(?:^|[\s"'`])(?:dark:|hover:|focus:|active:|disabled:|peer-.*:|group-.*:)?(?:bg|text|border)-(?:\[(?:#(?:[0-9a-fA-F]{3,6})|rgb|hsl|rgba|hsla)\])\b/, label: 'Arbitrary Color' },
  { pattern: /(?:^|[\s"'`])(?:dark:|hover:|focus:|active:|disabled:|peer-.*:|group-.*:)?(?:bg|text|border)-(?:white|black|red|blue|green|yellow|slate|gray|zinc|neutral|stone|orange|amber|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-[0-9]+\b/, label: 'Literal Color' },
  { pattern: /(?:^|[\s"'`])(?:dark:|hover:|focus:|active:|disabled:|peer-.*:|group-.*:)?font-(?:inter|sans|mono|serif)\b/, label: 'Literal Font' },
  { pattern: /#([0-9a-fA-F]{3,6})\b/, label: 'Raw Hex' },
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
  replacement?: string;
  priority: 'High' | 'Medium' | 'Low';
}

function getSuggestion(label: string, match: string): { suggestion: string, priority: Violation['priority'], replacement?: string } {
  const cleanMatch = match.replace(/^(?:dark:|hover:|focus:|active:|disabled:|peer-.*:|group-.*:)+/, '').trim();
  const prefix = match.match(/^(?:dark:|hover:|focus:|active:|disabled:|peer-.*:|group-.*:)+/)?.[0] || '';

  if (label === 'Raw Hex' || label === 'Arbitrary Color') {
    if (cleanMatch.includes('white') || cleanMatch.includes('#ffffff') || cleanMatch.includes('#FFF')) {
       const baseReplacement = cleanMatch.startsWith('bg-') ? 'bg-background' : (cleanMatch.startsWith('text-') ? 'text-foreground' : undefined);
       const replacement = baseReplacement ? `${prefix}${baseReplacement}` : undefined;
       return { suggestion: `${prefix}bg-background or ${prefix}text-foreground`, priority: 'High', replacement };
    }
    if (cleanMatch.includes('black') || cleanMatch.includes('#000000') || cleanMatch.includes('#000')) {
       const baseReplacement = cleanMatch.startsWith('bg-') ? 'bg-foreground' : (cleanMatch.startsWith('text-') ? 'text-background' : undefined);
       const replacement = baseReplacement ? `${prefix}${baseReplacement}` : undefined;
       return { suggestion: `${prefix}bg-foreground or ${prefix}text-background`, priority: 'High', replacement };
    }
    return { suggestion: 'Use theme tokens (primary, secondary, accent, etc.)', priority: 'High' };
  }
  if (label === 'Literal Color') {
    const isAllowed = WHITELIST.colors.some(c => cleanMatch.endsWith(`-${c}`));
    if (isAllowed) return { suggestion: '', priority: 'Low' };

    if (cleanMatch.includes('blue-600') || cleanMatch.includes('blue-500')) {
      const replacement = `${prefix}${cleanMatch.replace(/blue-(500|600)/, 'primary')}`;
      return { suggestion: replacement, priority: 'Medium', replacement };
    }
    if (cleanMatch.includes('slate-') || cleanMatch.includes('gray-')) {
       const baseReplacement = cleanMatch.includes('bg-') ? 'bg-muted' : (cleanMatch.includes('text-') ? 'text-muted-foreground' : (cleanMatch.includes('border-') ? 'border-border' : undefined));
       const replacement = baseReplacement ? `${prefix}${baseReplacement}` : undefined;
       return { suggestion: 'muted, muted-foreground or border', priority: 'Medium', replacement };
    }
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
              const { suggestion, priority, replacement } = getSuggestion(label, match[0]);
              // For Literal Color, only add if it's NOT in whitelist
              if (label === 'Literal Color' && WHITELIST.colors.some(c => match[0].endsWith(`-${c}`))) continue;
              
              if (suggestion || priority === 'High') {
                results.push({
                  file: fullPath,
                  line: index + 1,
                  match: match[0],
                  label,
                  suggestion,
                  replacement,
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

if (process.argv.includes('--apply-patch')) {
  console.log('Applying suggested patches...');
  Object.entries(groupedViolations).forEach(([file, fileViolations]) => {
    let content = readFileSync(file, 'utf-8');
    let hasChanges = false;
    
    // Sort violations by line descending to avoid index shifting if we were to multi-line replace,
    // but here we replace patterns within lines. To be safe, we process each line once.
    const lines = content.split('\n');
    fileViolations.forEach(v => {
      if (v.replacement) {
        const lineIdx = v.line - 1;
        if (lines[lineIdx].includes(v.match)) {
          lines[lineIdx] = lines[lineIdx].replace(v.match, v.replacement);
          hasChanges = true;
          console.log(`  [${file}:${v.line}] Fixed: ${v.match} -> ${v.replacement}`);
        }
      }
    });

    if (hasChanges) {
      writeFileSync(file, lines.join('\n'));
    }
  });
  console.log('Patch applied successfully.');
}

if (process.argv.includes('--ci')) {
  if (violations.length > 0) {
    process.stderr.write(`❌ ERROR: Found ${violations.length} violations across ${Object.keys(groupedViolations).length} files.\n`);
    process.exit(1);
  }
}


