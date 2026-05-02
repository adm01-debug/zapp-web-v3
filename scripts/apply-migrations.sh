#!/bin/bash
# apply-migrations.sh
# Apply all Contacts Module v3.0 migrations to the ZAPP WEB Supabase project.
# Run: bash scripts/apply-migrations.sh
#
# Requires: supabase CLI configured with project allrjhkpuscmgbsnmjlv

set -e

PROJECT_ID="allrjhkpuscmgbsnmjlv"
MIGRATIONS_DIR="supabase/migrations"

echo "🗄️  Applying Contacts Module v3.0 migrations..."
echo "Project: $PROJECT_ID"
echo ""

# Check supabase CLI
if ! command -v supabase &> /dev/null; then
  echo "❌ supabase CLI not found. Install: npm install -g supabase"
  exit 1
fi

# Apply in order
MIGRATIONS=(
  "20260501_contact_audit_log.sql"
  "20260501_contacts_soft_delete.sql"
  "20260501_contacts_performance_indexes.sql"
  "20260501_contacts_multiple_phones.sql"
  "20260501_contacts_pii_masking.sql"
  "20260501_contacts_optimistic_locking.sql"
  "20260502_contacts_dedup_constraints.sql"
)

for migration in "${MIGRATIONS[@]}"; do
  echo "⏳ Applying $migration..."
  supabase db push --project-ref "$PROJECT_ID" --file "$MIGRATIONS_DIR/$migration" 2>/dev/null || \
  supabase db query --project-ref "$PROJECT_ID" < "$MIGRATIONS_DIR/$migration"
  echo "✅ $migration applied!"
done

# Deploy Edge Functions
echo ""
echo "🚀 Deploying Edge Functions..."
supabase functions deploy contacts-import --project-ref "$PROJECT_ID"
echo "✅ contacts-import deployed!"

# Install frontend deps
echo ""
echo "📦 Installing frontend dependencies..."
npm install dompurify @types/dompurify @tanstack/react-virtual libphonenumber-js
echo "✅ Dependencies installed!"

# Run tests
echo ""
echo "🧪 Running tests..."
npm run test -- --reporter=verbose 2>&1 | tail -30

echo ""
echo "🏆 All migrations applied! Run 'npm run build' to verify."
