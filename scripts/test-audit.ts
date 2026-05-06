import { DS_CONFIG } from './ds-config';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';

const testFile = 'src/DS_TEST_FILE.tsx';
const testContent = `
import { cn } from "@/lib/utils";
import { clsx } from "clsx";

export const TestComponent = () => {
  return (
    <div className={cn(
      "bg-[#ffffff] text-black", // High priority
      "hover:bg-blue-500",      // Medium priority
      "dark:text-slate-200",    // Medium priority
      "font-inter",             // Low priority
      "bg-primary",             // Allowed
      "dark:hover:bg-[#000000]" // Nested variants
    )}>
      <p className={clsx("text-red-500", "group-hover:border-[#fff]")}>
        // @ds-ignore
        <span className="text-[#ff0000]">Ignored</span>
      </p>
    </div>
  );
};
`;

console.log('Running Design System Auditor Tests...');

try {
  writeFileSync(testFile, testContent);
  
  // Run audit and capture results
  execSync('bun run scripts/check-design-system.ts', { stdio: 'inherit' });
  
  const report = readFileSync('design-system-audit.md', 'utf-8');
  
  const expectedMatches = [
    'bg-[#ffffff]',
    'text-black',
    'hover:bg-blue-500',
    'dark:text-slate-200',
    'font-inter',
    'dark:hover:bg-[#000000]',
    'text-red-500',
    'group-hover:border-[#fff]'
  ];

  expectedMatches.forEach(match => {
    if (!report.includes(match)) {
      throw new Error(`Test Failed: Expected match "${match}" not found in report.`);
    }
  });

  if (report.includes('text-[#ff0000]')) {
    throw new Error('Test Failed: @ds-ignore was not respected.');
  }

  console.log('✅ All detection tests passed.');

  // Test Patching
  execSync('bun run scripts/check-design-system.ts --apply-patch', { stdio: 'inherit' });
  const patchedContent = readFileSync(testFile, 'utf-8');

  if (!patchedContent.includes('bg-background')) {
     throw new Error('Test Failed: bg-[#ffffff] was not patched to bg-background.');
  }
  if (!patchedContent.includes('hover:bg-primary')) {
     throw new Error('Test Failed: hover:bg-blue-500 was not patched to hover:bg-primary.');
  }

  console.log('✅ Patch/Codemod test passed.');

} catch (error) {
  console.error('❌ Tests Failed:', error.message);
  process.exit(1);
} finally {
  if (require('fs').existsSync(testFile)) unlinkSync(testFile);
}
