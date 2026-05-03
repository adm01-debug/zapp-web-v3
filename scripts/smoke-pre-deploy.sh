#!/usr/bin/env bash
# =====================================================================
# ZAPP Web — Pré-deploy smoke gate (Build 10/10)
# =====================================================================
set -euo pipefail

echo ""
echo "🚦 SMOKE PRE-DEPLOY — Evolution + WhatsApp Cloud + UI 10/10"
echo "=========================================================="

echo ""
echo "▶ [1/5] Vitest — UI Consistency (Segoe UI + WhatsApp Colors)"
npx vitest run src/features/inbox/components/chat/__tests__/VisualConsistency.test.tsx --reporter=default

echo ""
echo "▶ [2/5] Vitest — sendFunctionRouter (roteamento por provedor)"
npx vitest run src/lib/__tests__/sendFunctionRouter.smoke.test.ts --reporter=default

echo ""
echo "▶ [3/5] Deno — WhatsApp Cloud normalizer + assinatura HMAC"
deno test --allow-net --allow-env --allow-read \
  supabase/functions/_shared/__tests__/whatsapp-cloud-normalizer.test.ts

echo ""
echo "▶ [4/5] Deno — Paridade cross-provider do modelo unificado"
deno test --allow-net --allow-env --allow-read \
  supabase/functions/_shared/__tests__/parity.test.ts

echo ""
echo "▶ [5/5] Vitest — Chat Input & Interaction States"
npx vitest run src/features/inbox/components/chat/__tests__/ChatMessagesArea.localMode.test.tsx --reporter=default

echo ""
echo "✅ Pré-deploy verde — build 10/10 validado."
