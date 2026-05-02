#!/bin/bash
# install-contacts-deps.sh
# Run once after pulling these changes to install required packages.
#
# Packages added for the Contacts Module v3.0 improvements:
#   - dompurify        XSS sanitization (GAP-02)
#   - @types/dompurify TypeScript types for DOMPurify
#   - @tanstack/react-virtual   Virtual scroll for 100k+ contacts list
#   - libphonenumber-js  Advanced phone normalization (BR 9th digit, international)

echo "📦 Installing Contacts Module v3.0 dependencies..."

npm install dompurify @types/dompurify @tanstack/react-virtual libphonenumber-js

echo "✅ Done! New packages:"
echo "  - dompurify           (XSS prevention)"
echo "  - @types/dompurify    (TypeScript types)"
echo "  - @tanstack/react-virtual (Virtual scroll for large contact lists)"
echo "  - libphonenumber-js   (Phone normalization BR/international)"
echo ""
echo "📋 Next steps:"
echo "  1. Apply Supabase migrations: supabase db push"
echo "  2. Deploy Edge Function: supabase functions deploy contacts-import"
echo "  3. Run tests: npm run test"
