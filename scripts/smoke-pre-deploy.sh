#!/usr/bin/env bash
# =====================================================================
# ZAPP Web — Pré-deploy smoke gate
# Valida envio + webhook nos dois provedores (Evolution + WhatsApp Cloud)
# antes de qualquer deploy. Falha rápida = bloqueia release.
# =====================================================================
set -euo pipefail

echo ""
echo "🚦 SMOKE PRE-DEPLOY — Evolution + WhatsApp Cloud"
echo "================================================="

echo ""
echo "▶ [1/3] Vitest — sendFunctionRouter (roteamento por provedor)"
npx vitest run src/lib/__tests__/sendFunctionRouter.smoke.test.ts --reporter=default

echo ""
echo "▶ [2/3] Deno — WhatsApp Cloud normalizer + assinatura HMAC"
deno test --allow-net --allow-env --allow-read \
  supabase/functions/_shared/__tests__/whatsapp-cloud-normalizer.test.ts

echo ""
echo "▶ [3/3] Deno — Paridade cross-provider do modelo unificado"
deno test --allow-net --allow-env --allow-read \
  supabase/functions/_shared/__tests__/parity.test.ts

echo ""
echo "▶ [bonus] Deno — Suíte Evolution existente (sanity check)"
deno test --allow-net --allow-env --allow-read \
  supabase/functions/evolution-api/__tests__/

echo ""
echo "✅ Pré-deploy verde — pode liberar."
