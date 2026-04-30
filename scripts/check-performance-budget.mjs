#!/usr/bin/env node
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.cwd();
const DIST_DIR = join(ROOT, 'dist');
const MANIFEST_PATH = join(DIST_DIR, '.vite', 'manifest.json');
const BUDGET_PATH = join(ROOT, 'performance-budget.json');

function toKB(bytes) {
  return Number((bytes / 1024).toFixed(2));
}

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listFiles(full));
      continue;
    }
    out.push({ full, size: st.size, rel: full.replace(`${ROOT}/`, '') });
  }
  return out;
}

function getAssetSize(relFile) {
  const p = join(DIST_DIR, relFile);
  if (!existsSync(p)) return 0;
  return statSync(p).size;
}

function collectEntryAssets(manifest, entryKey = 'index.html') {
  const visited = new Set();
  const files = new Set();

  function visit(key) {
    if (!key || visited.has(key)) return;
    visited.add(key);
    const node = manifest[key];
    if (!node) return;

    if (node.file) files.add(node.file);
    for (const css of node.css ?? []) files.add(css);
    for (const imp of node.imports ?? []) visit(imp);
  }

  visit(entryKey);
  return [...files];
}

function sumByExt(assets, exts) {
  return assets
    .filter((f) => exts.includes(extname(f)))
    .reduce((acc, file) => acc + getAssetSize(file), 0);
}

function computeMetrics() {
  if (!existsSync(DIST_DIR) || !existsSync(MANIFEST_PATH)) {
    throw new Error('dist/.vite/manifest.json not found. Run `npm run build` first.');
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  const allFiles = listFiles(DIST_DIR);
  const entryAssets = collectEntryAssets(manifest, 'index.html');

  const allJsFiles = allFiles.filter((f) => extname(f.full) === '.js');
  const nonEntryJs = allJsFiles.filter((f) => !entryAssets.includes(f.rel.replace('dist/', '')));

  const initialJsBytes = sumByExt(entryAssets, ['.js']);
  const initialCssBytes = sumByExt(entryAssets, ['.css']);
  const largestChunkBytes = nonEntryJs.reduce((max, file) => Math.max(max, file.size), 0);
  const totalAssetsBytes = allFiles.reduce((acc, file) => acc + file.size, 0);

  return {
    measuredAt: new Date().toISOString(),
    initialJsKB: toKB(initialJsBytes),
    initialCssKB: toKB(initialCssBytes),
    largestChunkKB: toKB(largestChunkBytes),
    totalAssetsKB: toKB(totalAssetsBytes),
  };
}

function assertBudget(name, currentKB, config, failures, warnings) {
  if (!config) return;

  const hard = config.maxKB ?? null;
  const target = config.targetKB ?? null;

  if (target !== null && currentKB > target) {
    warnings.push(`${name}: ${currentKB}KB above target (${target}KB)`);
  }

  if (hard !== null && currentKB > hard) {
    failures.push(`${name}: ${currentKB}KB exceeds max (${hard}KB)`);
  }
}

function main() {
  const args = new Set(process.argv.slice(2));
  const writeBaseline = args.has('--write-baseline');

  const budget = JSON.parse(readFileSync(BUDGET_PATH, 'utf-8'));
  const metrics = computeMetrics();

  const failures = [];
  const warnings = [];

  assertBudget('initial-js', metrics.initialJsKB, budget.budgets['initial-js'], failures, warnings);
  assertBudget('initial-css', metrics.initialCssKB, budget.budgets['initial-css'], failures, warnings);
  assertBudget('largest-chunk', metrics.largestChunkKB, budget.budgets['largest-chunk'], failures, warnings);
  assertBudget('total-assets', metrics.totalAssetsKB, budget.budgets['total-assets'], failures, warnings);

  const baselinePath = budget.regression?.baselineFile ? join(ROOT, budget.regression.baselineFile) : null;
  if (baselinePath && existsSync(baselinePath)) {
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf-8'));
    const tolerancePct = Number(budget.regression?.tolerancePercent ?? 3);
    const factor = 1 + tolerancePct / 100;

    for (const [key, current] of Object.entries({
      initialJsKB: metrics.initialJsKB,
      initialCssKB: metrics.initialCssKB,
      largestChunkKB: metrics.largestChunkKB,
      totalAssetsKB: metrics.totalAssetsKB,
    })) {
      const prev = baseline[key];
      if (typeof prev !== 'number') continue;
      const limit = Number((prev * factor).toFixed(2));
      if (current > limit) {
        failures.push(`regression ${key}: ${current}KB > baseline ${prev}KB (+${tolerancePct}% => ${limit}KB)`);
      }
    }
  }

  if (writeBaseline && baselinePath) {
    writeFileSync(baselinePath, `${JSON.stringify(metrics, null, 2)}\n`);
    console.log(`✅ Baseline updated at ${baselinePath}`);
  }

  console.log('📐 Performance budget report');
  console.log(JSON.stringify(metrics, null, 2));

  if (warnings.length) {
    console.log('\n⚠️ Targets out of ideal range:');
    for (const w of warnings) console.log(` - ${w}`);
  }

  if (failures.length) {
    console.error('\n❌ Budget check failed:');
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }

  console.log('\n✅ Budget check passed.');
}

main();
