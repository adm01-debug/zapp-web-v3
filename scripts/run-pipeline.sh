#!/bin/bash
set -e

echo "🚀 Starting ZAPP Web QA Pipeline..."

# 1. Lint
echo "🔍 Running Linter..."
bun run lint || echo "⚠️ Lint warnings found"

# 2. Type Check
echo "📦 Running Type Checks..."
bunx tsc --noEmit || echo "⚠️ Type errors found"

# 3. Unit & Fuzz Tests (Vitest)
echo "🧪 Running Unit & UI Fuzz Tests..."
bunx vitest run --coverage

# 4. Edge Function Integration Tests (Deno)
echo "🌐 Running Edge Function Integration Tests..."
if command -v deno &> /dev/null; then
  deno test --allow-net --allow-env supabase/functions/
else
  echo "⚠️ Deno not found, skipping Edge Function tests."
fi

# 5. E2E & Visual Regression (Playwright)
echo "🎭 Running Playwright E2E Suite..."
bunx playwright test tests/e2e/critical-flows.spec.ts

echo "✅ QA Pipeline finished successfully!"
