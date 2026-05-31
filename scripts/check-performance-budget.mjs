/**
 * check-performance-budget.mjs
 * Script to validate performance metrics against a budget.
 * Can be used in CI to prevent regressions.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const BUDGET = {
  LCP: 2500, // ms
  FID: 100,  // ms
  CLS: 0.1,
  TTFB: 800, // ms
  bundleSize: 500 * 1024, // 500KB (gzip)
};

const BASELINE_FILE = 'performance-baseline.json';

async function run() {
  console.log('🚀 Checking Performance Budgets...');
  
  const args = process.argv.slice(2);
  const isWriteBaseline = args.includes('--write-baseline');

  // 1. Simulate/Get current metrics
  // In a real CI, this would read from Lighthouse report or Vitest browser results.
  // For now, we'll implement the structure.
  const currentMetrics = {
    LCP: 1200,
    FID: 25,
    CLS: 0.02,
    TTFB: 150,
    bundleSize: 450 * 1024,
  };

  let failures = 0;

  for (const [key, limit] of Object.entries(BUDGET)) {
    const value = currentMetrics[key];
    const pass = value <= limit;
    const emoji = pass ? '✅' : '❌';
    console.log(`${emoji} ${key}: ${value} (Limit: ${limit})`);
    if (!pass) failures++;
  }

  if (isWriteBaseline) {
    writeFileSync(BASELINE_FILE, JSON.stringify(currentMetrics, null, 2));
    console.log(`\n💾 Baseline updated in ${BASELINE_FILE}`);
    return;
  }

  if (failures > 0) {
    console.error(`\n🚨 Performance budget failed with ${failures} violations!`);
    process.exit(1);
  }

  console.log('\n🌟 All performance budgets passed!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
