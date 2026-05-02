#!/bin/bash
# install-contacts-deps-v3.sh — ZAPP WEB Contacts v3.0
# Run: bash scripts/install-contacts-deps-v3.sh

set -e
echo "📦 Installing Contacts Module v3.0 dependencies..."

npm install dompurify@^3.0.0
npm install --save-dev @types/dompurify@^3.0.0
npm install @tanstack/react-virtual@^3.0.0

echo "✅ Done! Run: npm run build && npm test"
