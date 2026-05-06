import fs from 'fs';
import path from 'path';

const UNUSED_FILES = [
  'src/test/msw/handlers.ts',
  'src/test/msw/browser.ts',
  'src/test/msw/server.ts',
  'src/test/setup.ts',
  'src/test/msw',
  'src/DS_TEST_FILE.tsx',
  'scripts/check-performance-budget.mjs',
  'performance-budget.json',
  'performance-budget-baseline.json'
];

function cleanup() {
  console.log('--- DEAD CODE CLEANUP ---');
  for (const file of UNUSED_FILES) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      if (fs.lstatSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
      console.log(`Deleted: ${file}`);
    }
  }
}

cleanup();
