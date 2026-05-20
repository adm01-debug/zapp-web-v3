#!/bin/bash
echo "🛠️  Preparing isolated test environment..."

# 1. Validate environment
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then
  echo "❌ Error: Required environment variables are missing."
  exit 1
fi

echo "✅ Environment variables present."

# 2. Configure Playwright for isolation
export PLAYWRIGHT_JSON_OUTPUT_NAME="results.json"
export VITE_APP_URL="http://localhost:5173"

echo "✨ Isolated test environment ready."
