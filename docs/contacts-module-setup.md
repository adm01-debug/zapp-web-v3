# Dependencies Required — Contacts Module Sprint

## npm packages to install

Run the following command in the project root to install all dependencies added during the Contacts Module Sprint:

```bash
npm install dompurify @types/dompurify
```

## Why these packages?

### dompurify + @types/dompurify
- **Used by:** `src/lib/sanitize.ts`
- **Purpose:** XSS prevention — sanitizes all user-supplied HTML before rendering
- **OWASP:** Addresses A03:2021 Injection
- **Size:** ~50KB minified (tree-shakeable)

## Supabase Migrations to Apply

Run these migrations in order in your Supabase Dashboard → SQL Editor:

1. `supabase/migrations/20260501_contact_audit_log.sql`
2. `supabase/migrations/20260501_contacts_soft_delete.sql`
3. `supabase/migrations/20260501_contacts_performance_indexes.sql`
4. `supabase/migrations/20260501_contacts_multiple_phones.sql`
5. `supabase/migrations/20260501_contacts_pii_masking.sql`
6. `supabase/migrations/20260501_contacts_optimistic_locking.sql`
7. `supabase/migrations/20260502_contacts_schema_finalization.sql`

## Supabase Edge Functions to Deploy

```bash
supabase functions deploy contacts-import
```

## Verification Checklist

After applying all migrations, verify:

- [ ] `contact_audit_log` table exists with RLS enabled
- [ ] `contacts.deleted_at` column exists (soft delete)
- [ ] `contacts.phone_numbers` JSONB column exists
- [ ] `contacts.version` column exists (optimistic locking)
- [ ] `contacts.search_vector` generated column exists
- [ ] `contacts.lgpd_consent_at` and LGPD columns exist
- [ ] `soft_delete_contact()` RPC works
- [ ] `restore_contact()` RPC works
- [ ] `search_contacts()` RPC works (with unaccent)
- [ ] `find_duplicate_contacts()` RPC works
- [ ] `update_contact_versioned()` RPC works
- [ ] `v_contacts_masked` view exists
- [ ] `v_contact_phones` view exists
- [ ] `mask_phone()` function returns masked phone for viewers
- [ ] `can_see_pii()` returns true for admins, false for agents
- [ ] `contacts-import` Edge Function deployed and responding
