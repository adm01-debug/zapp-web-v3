import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'fs';
import { join, extname, relative } from 'path';
import { DS_CONFIG } from './ds-config';

const { WHITELIST, VARIANTS, FORBIDDEN_PATTERNS, IGNORE_DIRECTIVE, IGNORED_FILES, IGNORED_DIRS } = DS_CONFIG;

export interface Violation {
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

export function getSuggestion(label: string, match: string): { suggestion: string, priority: Violation['priority'], replacement?: string, cleanMatch: string, prefix: string } {
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
       return { cleanMatch, prefix, suggestion: `${prefix}${baseReplacement || 'bg-background'}`, priority: 'High', replacement };
    }
    if (isBlack) {
       const baseReplacement = cleanMatch.startsWith('bg-') ? 'bg-foreground' : (cleanMatch.startsWith('text-') ? 'text-background' : undefined);
       const replacement = baseReplacement ? `${prefix}${baseReplacement}` : undefined;
       return { cleanMatch, prefix, suggestion: `${prefix}${baseReplacement || 'bg-foreground'}`, priority: 'High', replacement };
    }
    return { cleanMatch, prefix, suggestion: 'Use theme tokens (primary, secondary, etc.)', priority: 'High' };
  }

  if (label === 'Literal Color') {
    if (WHITELIST.colors.some(c => cleanMatch.endsWith(`-${c}`))) return { cleanMatch, prefix, suggestion: '', priority: 'Low' };

    if (cleanMatch.includes('blue-600') || cleanMatch.includes('blue-500')) {
      const replacement = `${prefix}${cleanMatch.replace(/blue-(500|600)/, 'primary')}`;
      return { cleanMatch, prefix, suggestion: replacement, priority: 'Medium', replacement };
    }
    if (cleanMatch.includes('slate-') || cleanMatch.includes('gray-') || cleanMatch.includes('zinc-')) {
       const baseReplacement = cleanMatch.includes('bg-') ? 'bg-muted' : (cleanMatch.includes('text-') ? 'text-muted-foreground' : (cleanMatch.includes('border-') ? 'border-border' : undefined));
       const replacement = baseReplacement ? `${prefix}${baseReplacement}` : undefined;
       return { cleanMatch, prefix, suggestion: replacement || 'muted/border', priority: 'Medium', replacement };
    }
    return { cleanMatch, prefix, suggestion: 'Use semantic tokens (destructive, muted, etc.)', priority: 'Medium' };
  }

  if (label === 'Literal Font') {
    return { cleanMatch, prefix, suggestion: 'Remove literal font; use global typography', priority: 'Low' };
  }
  return { cleanMatch, prefix, suggestion: 'Check design system tokens', priority: 'Low' };
}

export function scanContent(content: string, fileName: string, results: Violation[]) {
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    if (line.includes(IGNORE_DIRECTIVE)) return;

    FORBIDDEN_PATTERNS.forEach(({ pattern, label }) => {
      const variantsPart = `(?:(?:${VARIANTS.join('|')}):)*`;
      const fullPattern = new RegExp(`${variantsPart}${pattern.source}`, 'g');
      const matches = line.matchAll(fullPattern);
      
      for (const match of matches) {
        const rawMatch = match[0].trim();
        if (!rawMatch) continue;

        const { suggestion, priority, replacement, cleanMatch, prefix } = getSuggestion(label, rawMatch);
        
        if (label === 'Literal Color' && WHITELIST.colors.some(c => cleanMatch.endsWith(`-${c}`))) continue;
        
        if (suggestion || priority === 'High') {
          results.push({
            file: fileName,
            line: index + 1,
            match: rawMatch,
            cleanMatch,
            prefix: prefix || '(none)',
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
    scanContent(content, relative(process.cwd(), fullPath), results);
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const applyPatch = args.includes('--apply-patch') || dryRun;
  const ci = args.includes('--ci');
  const pathArg = args.find(a => !a.startsWith('--'));
  const minPriorityArg = args.find(a => a.startsWith('--min-priority='))?.split('=')[1] || 'Low';
  
  const priorityMap = { 'High': 3, 'Medium': 2, 'Low': 1 };
  const minPriorityValue = priorityMap[minPriorityArg as keyof typeof priorityMap] || 1;

  const scanPath = pathArg || './src';
  const violations: Violation[] = [];
  
  console.log(`🔍 Scanning ${scanPath} (min-priority: ${minPriorityArg})...`);

  if (!existsSync(scanPath)) {
    console.error(`❌ Path does not exist: ${scanPath}`);
    process.exit(1);
  }

  if (statSync(scanPath).isDirectory()) {
    scanDir(scanPath, violations);
  } else {
    const content = readFileSync(scanPath, 'utf-8');
    scanContent(content, relative(process.cwd(), scanPath), violations);
  }

  const filteredViolations = violations.filter(v => priorityMap[v.priority] >= minPriorityValue);

  if (filteredViolations.length === 0) {
    console.log('✅ No violations found.');
    process.exit(0);
  }

  // Generate Reports
  const groupedViolations: Record<string, Violation[]> = {};
  filteredViolations.forEach(v => {
    if (!groupedViolations[v.file]) groupedViolations[v.file] = [];
    groupedViolations[v.file].push(v);
  });

  // Markdown Report
  let mdReport = `# Design System Audit\nGenerated on: ${new Date().toLocaleString()}\n\n`;
  Object.entries(groupedViolations).forEach(([file, fileViolations]) => {
    mdReport += `## ${file}\n| Priority | Line | Type | Raw Match | Variant | Clean Match | Suggestion |\n|---|---|---|---|---|---|---|\n`;
    fileViolations.forEach(v => {
      mdReport += `| ${v.priority} | ${v.line} | ${v.label} | \`${v.match}\` | \`${v.prefix}\` | \`${v.cleanMatch}\` | ${v.suggestion} |\n`;
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
      .medium { color: #f59e0b; font-weight: bold; }
      code { background: #f1f1f1; padding: 2px 4px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <h1>Design System Audit</h1>
    ${Object.entries(groupedViolations).map(([file, fileViolations]) => `
      <div class="card">
        <h3>${file}</h3>
        <table>
          <thead>
            <tr>
              <th>Priority</th>
              <th>Line</th>
              <th>Raw Match</th>
              <th>Variant</th>
              <th>Clean Match</th>
              <th>Suggestion</th>
            </tr>
          </thead>
          <tbody>
            ${fileViolations.map(v => `
              <tr>
                <td class="${v.priority.toLowerCase()}">${v.priority}</td>
                <td>${v.line}</td>
                <td><code>${v.match}</code></td>
                <td><code>${v.prefix}</code></td>
                <td><code>${v.cleanMatch}</code></td>
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

  if (applyPatch) {
    console.log(dryRun ? '\n--- Dry Run: Proposed Changes ---' : '\n--- Applying Patches ---');
    Object.entries(groupedViolations).forEach(([file, fileViolations]) => {
      let content = readFileSync(file, 'utf-8');
      let lines = content.split('\n');
      let hasChanges = false;
      
      fileViolations.forEach(v => {
        if (v.replacement && lines[v.line-1].includes(v.match)) {
          console.log(`[${file}:${v.line}] Replace "${v.match}" with "${v.replacement}"`);
          lines[v.line-1] = lines[v.line-1].replace(v.match, v.replacement);
          hasChanges = true;
        }
      });
      
      if (hasChanges && !dryRun) {
        writeFileSync(file, lines.join('\n'));
      }
    });
    console.log(dryRun ? '--- End of Dry Run ---' : '✅ Applied patches.');
  }

  if (ci && filteredViolations.length > 0) {
    console.error(`❌ Found ${filteredViolations.length} violations.`);
    process.exit(1);
  }
}

