# E2E: Webhook → Inbox unified flow (Evolution + WhatsApp Cloud)

## Goal

Prove that a synthetic webhook event posted to **both** provider endpoints (`evolution-webhook` and `whatsapp-cloud-webhook`) lands in the **same** unified data model (`evolution_messages` + `evolution_contacts` on FATOR X) and therefore appears identically in the Inbox.

## Approach

Single Playwright spec `e2e/webhook-providers-parity.spec.ts` that, for each provider:

1. Generates a unique `e2e-` scoped `remoteJid` / `wamid` (so the existing `e2e-fixtures` cleanup guard handles teardown).
2. Builds a provider-specific payload (Evolution `messages.upsert` shape vs Meta `whatsapp_business_account.messages` shape).
3. POSTs the payload to the deployed Edge Function URL.
4. Polls FATOR X via `external-db-proxy` (already used by the app and authenticated with the logged-in user) until the message + contact appear, with a timeout.
5. Asserts row parity: both providers must produce a row with the same normalized `remote_jid` (`<digits>@s.whatsapp.net`), `direction='inbound'`, matching `content`, and a contact upsert.

A new Edge Function `e2e-webhook-fixture` is added to:
- Compute the HMAC-SHA256 signature for Evolution (`x-hub-signature-256` style) using `EVOLUTION_WEBHOOK_SECRET` server-side, so the secret never leaves the server.
- Compute the Meta signature using a synthetic `whatsapp_official_credentials` row that the function seeds (and tears down) for the test phone number id (`e2e-phone-<runId>`), again keeping `app_secret` server-side.
- Return the signed POST result + the normalized `remote_jid` so the spec can assert.

This avoids exposing webhook secrets to the browser/CI worker while keeping the test fully end-to-end (real HTTP → real Edge Function → real DB).

## Files

**New**
- `supabase/functions/e2e-webhook-fixture/index.ts` — admin/service-role guarded helper that:
  - `action: 'seed-cloud-creds'` → inserts a temporary `whatsapp_official_credentials` row keyed by `phone_number_id = e2e-<runId>` with a random `app_secret` and `verify_token`.
  - `action: 'send-evolution'` → builds an Evolution `messages.upsert` payload, signs it with `EVOLUTION_WEBHOOK_SECRET`, POSTs to `/functions/v1/evolution-webhook`, returns `{status, remoteJid, messageId}`.
  - `action: 'send-cloud'` → builds a Meta payload referencing the seeded `phone_number_id`, signs it with the seeded `app_secret`, POSTs to `/functions/v1/whatsapp-cloud-webhook`, returns `{status, remoteJid, wamid}`.
  - `action: 'cleanup'` → deletes the seeded credentials row and any `evolution_messages` / `evolution_contacts` whose `remote_jid` starts with `e2e-`.
  - All inputs validated with the same `e2e-` prefix guard already used by `e2e-fixtures`.

- `e2e/webhook-providers-parity.spec.ts` — Playwright spec with two test cases (`evolution`, `cloud`) and one parity assertion. Uses authenticated page + calls the fixture function with the user's JWT (admin) or service role via env. Polls `rpc_list_messages` for the synthetic `remote_jid` until the row appears (max 15s).

**Edited**
- `e2e/utils/supabase.ts` — add `cleanupWebhookProviderE2E(runId)` helper that calls the new fixture function with `action: 'cleanup'`.
- `docs/testing/e2e.md` — short section documenting the new spec, how secrets are handled, and how to run it locally (`E2E_WEBHOOK_PARITY=1 bunx playwright test webhook-providers-parity`).

## Technical notes

- The Evolution webhook requires HMAC validation when `EVOLUTION_WEBHOOK_SECRET` is set; the helper signs with the same algo used by `_shared/hmac-validation.ts` (`sha256=<hex>` over raw body).
- The Meta webhook requires `x-hub-signature-256` validated against the credential row's `app_secret`; we seed a row so the signature check passes deterministically.
- Both flows ultimately call `rpc_insert_message` / `rpc_upsert_contact` on FATOR X — the parity assertion compares the resulting rows column-by-column for `remote_jid`, `direction`, `from_me`, `content`, `message_type`.
- All synthetic data uses `e2e-` prefix so the existing cleanup guards (and the new one) refuse to touch production rows.
- Spec is gated by `process.env.E2E_WEBHOOK_PARITY === '1'` so it does not run in default CI unless secrets are present; CI workflow can opt-in by exporting the flag in the smoke-pre-deploy job.
