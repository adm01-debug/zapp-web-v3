# Plano adicional de lazy-loading (Q2 2026)

## Objetivo
Reduzir o custo de JS inicial nas rotas críticas (`/`, `/auth`, `/inbox`, `/queue-details`) para convergir no alvo de **<= 250KB** quando tecnicamente viável.

## Módulos pesados priorizados

1. **`recharts` / dashboards analíticos**
   - Situação atual: chunk dedicado `vendor-charts`.
   - Plano: carregar gráficos somente quando o bloco entra no viewport (Intersection Observer) + fallback skeleton.
   - Owner: Frontend Platform.

2. **`mapbox-gl` / mensagens de localização**
   - Situação atual: chunk `vendor-mapbox` já separado.
   - Plano: gate por ação do usuário (abrir mapa) e prefetch sob idle callback em páginas com alta taxa de uso.
   - Owner: Inbox Team.

3. **`xlsx` + `jspdf` / exportações**
   - Situação atual: chunks `vendor-xlsx` e `vendor-pdf`.
   - Plano: mover trigger de import para clique em export e remover imports indiretos em render inicial.
   - Owner: Admin Ops.

4. **Painéis de IA (`@elevenlabs`, módulos AI assistive)**
   - Situação atual: chunk `vendor-elevenlabs` separado.
   - Plano: split por feature-flag e prefetch apenas para usuários com permissão/uso recente.
   - Owner: AI Experience.

## Ações técnicas

- Criar telemetria por rota (JS inicial + tempo de hydrate) para identificar rotas acima do budget.
- Ajustar imports em `src/App.tsx` para garantir que providers não críticos fiquem em boundary lazy pós-first-paint.
- Revisar componentes de inbox para converter diálogos auxiliares em `lazyWithRetry` quando ainda estiverem eager.
- Introduzir `requestIdleCallback` para prefetch seletivo de chunk somente após interação primária.

## Critério de pronto

- Budget check no CI sem regressões por 2 semanas seguidas.
- Rotas críticas mantendo target dentro de `performance-budget.json` (hard cap sem violações).
- Web Vitals enviados para backend observability com correlação por rota.
