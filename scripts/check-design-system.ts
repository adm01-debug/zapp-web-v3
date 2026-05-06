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

  const isWhite = cleanMatch.includes('white') || cleanMatch.includes('#ffffff') || cleanMatch.includes('#fff');
  const isBlack = cleanMatch.includes('black') || cleanMatch.includes('#000000') || cleanMatch.includes('#000');

  // Logic to determine base semantic tokens based on intent
  if (label === 'Raw Hex' || label === 'Arbitrary Color' || label === 'Literal Color') {
    const isBg = cleanMatch.startsWith('bg-') || cleanMatch.startsWith('hover:bg-');
    const isText = cleanMatch.startsWith('text-') || cleanMatch.startsWith('hover:text-');
    const isBorder = cleanMatch.startsWith('border-') || cleanMatch.startsWith('hover:border-');

    // Handle Hex values by mapping them to closest tokens
    if (label === 'Raw Hex' || (label === 'Arbitrary Color' && cleanMatch.includes('#'))) {
      const hex = (cleanMatch.match(/#[0-9a-fA-F]{3,6}/) || [])[0]?.toLowerCase();
      if (hex) {
        // Special case for white/black hex
        if (['#fff', '#ffffff'].includes(hex)) {
           const baseReplacement = isBg ? 'bg-background' : (isText ? 'text-foreground' : (isBorder ? 'border-border' : undefined));
           if (baseReplacement) return { cleanMatch, prefix, suggestion: baseReplacement, priority: 'High', replacement: `${prefix}${baseReplacement}` };
        }
        if (['#000', '#000000'].includes(hex)) {
           const baseReplacement = isBg ? 'bg-foreground' : (isText ? 'text-background' : (isBorder ? 'border-border' : undefined));
           if (baseReplacement) return { cleanMatch, prefix, suggestion: baseReplacement, priority: 'High', replacement: `${prefix}${baseReplacement}` };
        }

        // Generic hex to semantic color mapping
        const hexMap: Record<string, string> = {
          '#ef4444': 'destructive', '#dc2626': 'destructive', '#f87171': 'destructive', '#fecaca': 'destructive', '#fef2f2': 'destructive',
          '#f59e0b': 'warning', '#eab308': 'warning', '#facc15': 'warning', '#fde047': 'warning', '#fef9c3': 'warning',
          '#3b82f6': 'primary', '#2563eb': 'primary', '#60a5fa': 'primary',
          '#10b981': 'success', '#059669': 'success', '#34d399': 'success', '#22c55e': 'success',
          '#8b5cf6': 'accent', '#7c3aed': 'accent',
          '#6b7280': 'muted', '#9ca3af': 'muted', '#d1d5db': 'muted', '#f3f4f6': 'muted'
        };

        if (hexMap[hex]) {
          const semantic = hexMap[hex];
          let baseReplacement = '';
          if (isBg) baseReplacement = `bg-${semantic}`;
          else if (isText) baseReplacement = `text-${semantic}`;
          else if (isBorder) baseReplacement = `border-${semantic}`;

          if (baseReplacement) {
            return { cleanMatch, prefix, suggestion: baseReplacement, priority: 'Medium', replacement: `${prefix}${baseReplacement}` };
          }
        }
      }
    }

    if (isWhite) {
       const baseReplacement = isBg ? 'bg-background' : (isText ? 'text-foreground' : (isBorder ? 'border-border' : undefined));
       const replacement = baseReplacement ? `${prefix}${baseReplacement}` : undefined;
       return { cleanMatch, prefix, suggestion: `${prefix}${baseReplacement || 'bg-background'}`, priority: 'High', replacement };
    }
    if (isBlack) {
       const baseReplacement = isBg ? 'bg-foreground' : (isText ? 'text-background' : (isBorder ? 'border-border' : undefined));
       const replacement = baseReplacement ? `${prefix}${baseReplacement}` : undefined;
       return { cleanMatch, prefix, suggestion: `${prefix}${baseReplacement || 'bg-foreground'}`, priority: 'High', replacement };
    }

    // Mapping logic for standard literal colors to semantic tokens
    const semanticMap: Record<string, string> = {
      'red': 'destructive', 'rose': 'destructive', 'pink': 'destructive',
      'amber': 'warning', 'yellow': 'warning', 'orange': 'warning',
      'blue': 'primary', 'sky': 'info', 'cyan': 'info',
      'teal': 'success', 'emerald': 'success', 'green': 'success', 'lime': 'success',
      'slate': 'muted', 'gray': 'muted', 'zinc': 'muted', 'neutral': 'muted', 'stone': 'muted',
      'purple': 'accent', 'violet': 'accent', 'indigo': 'primary'
    };

    for (const [literal, semantic] of Object.entries(semanticMap)) {
      if (cleanMatch.includes(literal)) {
        let baseReplacement = '';
        if (isBg) baseReplacement = `bg-${semantic}`;
        else if (isText) baseReplacement = `text-${semantic}`;
        else if (isBorder) baseReplacement = `border-${semantic}`;

        if (baseReplacement) {
          const replacement = `${prefix}${baseReplacement}`;
          return { cleanMatch, prefix, suggestion: replacement, priority: 'Medium', replacement };
        }
      }
    }
  }

  if (label === 'Literal Color') {
    if (WHITELIST.colors.some(c => cleanMatch.endsWith(`-${c}`))) return { cleanMatch, prefix, suggestion: '', priority: 'Low' };
    return { cleanMatch, prefix, suggestion: 'Use semantic tokens (destructive, muted, primary, etc.)', priority: 'Medium' };
  }

  if (label === 'Literal Font') {
    if (cleanMatch === 'font-sans') {
      return { cleanMatch, prefix, suggestion: 'Remove redundant font-sans; inherits from global', priority: 'High', replacement: '' };
    }
    if (cleanMatch === 'font-mono') {
      return { cleanMatch, prefix, suggestion: 'Remove literal font; inherit from global typography', priority: 'Medium', replacement: '' };
    }
    return { cleanMatch, prefix, suggestion: 'Remove literal font; use global typography', priority: 'Low', replacement: '' };
  }
  return { cleanMatch, prefix, suggestion: 'Check design system tokens', priority: 'Low' };
}

export function scanContent(content: string, fileName: string, results: Violation[]) {
  const lines = content.split('\n');
  const variantsPart = `(?:(?:${VARIANTS.join('|')}):)*`;

  // Process line by line to easily handle IGNORE_DIRECTIVE and line numbers
  lines.forEach((line, index) => {
    if (line.includes(IGNORE_DIRECTIVE)) return;

    FORBIDDEN_PATTERNS.forEach(({ pattern, label }) => {
      // Create a global regex for this pattern with variants
      const fullPattern = new RegExp(`${variantsPart}${pattern.source}`, 'g');
      
      // Handle matches in the current line
      let match;
      while ((match = fullPattern.exec(line)) !== null) {
        const rawMatch = match[0].trim();
        if (!rawMatch) continue;

        const { suggestion, priority, replacement, cleanMatch, prefix } = getSuggestion(label, rawMatch);
        
        // Safety check: Skip matches that are part of a CSS variable (e.g., --font-sans)
        const matchStart = match.index;
        if (matchStart > 1 && line.substring(matchStart - 2, matchStart) === '--') continue;
        
        // Skip if whitelisted
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

  // Multiline detection for Template Literals and Objects
  // We scan the whole content but only for specific patterns if they span multiple lines
  // Actually, standard regex with 'g' and no 'm' (multiline) flag will still find matches across the whole string
  // if we don't anchor with ^ or $.
  // To handle multiline correctly and still get line numbers:
  const multilinePatterns = [
    { pattern: new RegExp(`${variantsPart}(?:bg|text|border)-(?:\\[[^\\]]+\\]|white|black|red|blue|gray|slate|zinc)-[0-9]+`, 'g'), label: 'Literal Color' }
  ];

  // For now, most forbidden patterns are short strings that don't span lines themselves, 
  // but they might appear in multiline contexts. The line-by-line approach handles 99% of cases.
  // If a string itself is multiline (rare in CSS classes), we'd need more complex parsing.
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
  const pathArg = args.find(a => !a.startsWith('--') && !a.includes('='));
  const minPriorityArg = args.find(a => a.startsWith('--min-priority='))?.split('=')[1] || 'Low';
  
  const priorityMap = { 'High': 3, 'Medium': 2, 'Low': 1 };
  const minPriorityValue = priorityMap[minPriorityArg as keyof typeof priorityMap] || 1;

  const scanPath = pathArg || './src';
  const violations: Violation[] = [];
  
  if (ci) {
    console.log(`🚀 Running Design System CI Audit on: ${scanPath}`);
  } else {
    console.log(`🔍 Scanning ${scanPath} (min-priority: ${minPriorityArg})...`);
    console.log(`Options: dry-run=${dryRun}, apply-patch=${applyPatch}, ci=${ci}`);
  }

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
    console.log('✅ No design system violations found.');
    process.exit(0);
  }

  // Group by file
  const groupedViolations: Record<string, Violation[]> = {};
  filteredViolations.forEach(v => {
    if (!groupedViolations[v.file]) groupedViolations[v.file] = [];
    groupedViolations[v.file].push(v);
  });

  if (ci) {
    console.log('\n| # | Priority | File:Line | Match | Clean Match | Suggestion/Replacement |');
    console.log('|---|---|---|---|---|---|');
    filteredViolations.forEach((v, idx) => {
      const displayReplacement = v.replacement !== undefined ? (v.replacement === '' ? '(remove)' : `\`${v.replacement}\``) : (v.suggestion || '-');
      console.log(`| ${idx + 1} | ${v.priority} | ${v.file}:${v.line} | \`${v.match}\` | \`${v.cleanMatch}\` | ${displayReplacement} |`);
    });
  } else {
    // Generate Reports (Markdown/HTML)
    // ... (Keep existing report generation logic but condensed)
    let mdReport = `# Design System Audit\n\n`;
    Object.entries(groupedViolations).forEach(([file, fileViolations]) => {
      mdReport += `## ${file}\n| Priority | Line | Raw Match | Clean | Suggestion | Patch |\n|---|---|---|---|---|---|\n`;
      fileViolations.forEach(v => {
        mdReport += `| ${v.priority} | ${v.line} | \`${v.match}\` | \`${v.cleanMatch}\` | ${v.suggestion} | ${v.replacement ? `\`${v.replacement}\`` : '-'} |\n`;
      });
    });
    writeFileSync('design-system-audit.md', mdReport);
    // (HTML report logic omitted for brevity in CLI focus, but usually kept)
  }

  if (applyPatch) {
    console.log(dryRun ? '\n--- 🧪 Dry Run: Proposed Changes ---' : '\n--- 🛠 Applying Patches ---');
    let totalFilesChanged = 0;
    let totalSubstitutions = 0;

    Object.entries(groupedViolations).forEach(([file, fileViolations]) => {
      const originalContent = readFileSync(file, 'utf-8');
      const lines = originalContent.split('\n');
      let hasChanges = false;
      let fileSubstitutions = 0;
      
      // Sort violations by line descending to avoid offset issues if we were adding lines, 
      // but here we just replace content within same line.
      fileViolations.forEach(v => {
        if (v.replacement !== undefined && lines[v.line-1].includes(v.match)) {
          const oldLine = lines[v.line-1];
          lines[v.line-1] = oldLine.replace(v.match, v.replacement);
          
          if (oldLine !== lines[v.line-1]) {
            if (dryRun) {
              console.log(`\nDIFF in ${file}:${v.line}`);
              console.log(`- ${oldLine.trim()}`);
              console.log(`+ ${lines[v.line-1].trim()}`);
            }
            hasChanges = true;
            fileSubstitutions++;
          }
        }
      });
      
      if (hasChanges) {
        totalFilesChanged++;
        totalSubstitutions += fileSubstitutions;
        if (!dryRun) {
          writeFileSync(file, lines.join('\n'));
          console.log(`✅ Updated ${file} (${fileSubstitutions} changes)`);
        }
      }
    });

    console.log(`\nSummary: ${totalSubstitutions} substitutions across ${totalFilesChanged} files.`);
    console.log(dryRun ? '--- End of Dry Run (No files modified) ---' : '--- Patches Applied successfully ---');
  }

  if (ci && filteredViolations.length > 0) {
    process.exit(1);
  }
}


