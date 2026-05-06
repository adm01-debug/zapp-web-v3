import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname } from 'path';

const FORBIDDEN_PATTERNS = [
  { pattern: /#[0-9a-fA-F]{3,6}/, label: 'Hex Color' },
  { pattern: /bg-\[(#[0-9a-fA-F]+|rgb|hsl)/, label: 'Arbitrary BG' },
  { pattern: /text-\[(#[0-9a-fA-F]+|rgb|hsl)/, label: 'Arbitrary Text' },
  { pattern: /border-\[(#[0-9a-fA-F]+|rgb|hsl)/, label: 'Arbitrary Border' },
  { pattern: /bg-(white|black|red|blue|green|yellow|slate|gray|zinc|neutral|stone|orange|amber|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-[0-9]+/, label: 'Literal Color' },
  { pattern: /font-(inter|sans|mono|serif)/, label: 'Literal Font' },
];

const IGNORED_FILES = [
  'DesignSystem.tsx',
  'tailwind.config.ts',
  'index.css',
  'check-design-system.ts',
];

const IGNORED_DIRS = [
  'node_modules',
  '.git',
  'dist',
];

interface Violation {
  file: string;
  line: number;
  match: string;
  label: string;
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
          const match = line.match(pattern);
          if (match && !line.includes('// @ds-ignore')) {
            results.push({
              file: fullPath,
              line: index + 1,
              match: match[0],
              label
            });
          }
        });
      });
    } catch (e) {
      console.error(`Error reading ${fullPath}:`, e);
    }
  }
}

const violations: Violation[] = [];
scanDir('./src', violations);

// Generate Markdown Report
const mdReport = `# Design System Violations Report
Generated on: ${new Date().toLocaleString()}
Total Violations: ${violations.length}

| File | Line | Violation Type | Value |
|------|------|----------------|-------|
${violations.map(v => `| \`${v.file}\` | ${v.line} | ${v.label} | \`${v.match}\` |`).join('\n')}
`;

writeFileSync('design-system-report.md', mdReport);

// Generate HTML Report
const htmlReport = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Design System Audit</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 2rem; background: #f9fafb; color: #111827; }
        h1 { color: #1f2937; }
        .summary { margin-bottom: 2rem; padding: 1rem; background: white; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; background: white; border-radius: 0.5rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f3f4f6; font-weight: 600; }
        tr:hover { background: #f9fafb; }
        .label { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
        .label-Hex-Color { background: #fee2e2; color: #991b1b; }
        .label-Literal-Color { background: #ffedd5; color: #9a3412; }
        code { background: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-size: 0.875rem; }
    </style>
</head>
<body>
    <h1>Design System Audit Report</h1>
    <div class="summary">
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Total Deviations:</strong> ${violations.length}</p>
    </div>
    <table>
        <thead>
            <tr>
                <th>File</th>
                <th>Line</th>
                <th>Type</th>
                <th>Value</th>
            </tr>
        </thead>
        <tbody>
            ${violations.map(v => `
                <tr>
                    <td><code>${v.file}</code></td>
                    <td>${v.line}</td>
                    <td><span class="label label-${v.label.replace(' ', '-')}">${v.label}</span></td>
                    <td><code>${v.match}</code></td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;

writeFileSync('design-system-report.html', htmlReport);

if (violations.length > 0) {
  console.error(`\x1b[31mFound ${violations.length} Design System violations.\x1b[0m`);
  console.log(`Reports generated: design-system-report.md, design-system-report.html`);
  process.exit(1);
} else {
  console.log('\x1b[32m✅ No Design System violations found!\x1b[0m');
}
