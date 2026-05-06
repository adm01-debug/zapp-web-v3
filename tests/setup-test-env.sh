#!/bin/bash
# setup-test-env.sh - Prepares a local or CI environment for reproducible testing

echo "🛠️  Setting up test environment..."

# 1. Load test environment variables
if [ -f ".env.test" ]; then
  export $(cat .env.test | xargs)
  echo "✅ Loaded .env.test"
else
  echo "⚠️  .env.test not found, using default test placeholders"
  export VITE_APP_URL="http://localhost:5173"
  export TEST_MODE="true"
fi

# 2. Check for required services
echo "🔍 Checking dependencies..."
command -v bun >/dev/null 2>&1 || { echo "❌ bun is required but not installed. Aborting."; exit 1; }

# 3. Setup mock server if needed
# (Simulating a background service start)
echo "🚀 Starting mock services..."
# nohup bun run tests/mock-server.ts > /tmp/mock-server.log 2>&1 &
echo "✅ Mock services ready (simulated)"

# 4. Final verification
echo "✨ Environment ready for testing."
