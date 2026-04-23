

## Alertas em tempo real: assinaturas inválidas + silêncio do webhook

### Contexto

A página `AdminWebhookSecretStatusPage` agora mostra status por instância (último evento, latência, taxa de validação HMAC), mas é **passiva** — o admin precisa abrir a aba pra perceber problemas. Falta empurrar alertas quando:

1. **Pico de assinaturas inválidas** — ex.: instância `wpp2` salta de 0% pra 5%+ de `signature_valid=false` numa janela curta (possível chave HMAC errada, replay attack, ou rotação mal feita).
2. **Silêncio do webhook** — nenhum evento recebido por X minutos numa instância que normalmente é ativa (possível Evolution caído, túnel quebrado, ou instância desconectada).

### O que vai ser construído

#### 1. Hook `useWebhookHealthAlerts`

Novo hook em `src/hooks/useWebhookHealthAlerts.ts` que:

- Faz polling a cada 30s da query `evolution_webhook_events` (últimos 15 min, agrupado por instância) via `queryExternalProxy` — mesmo padrão usado nas outras páginas admin.
- Executa duas avaliações por instância:
  - **Invalid signature spike**: se `invalidRate >= thresholds.invalidRatePct` E `total >= thresholds.minSampleSize` → dispara alerta `signature_spike`.
  - **Silence window**: se `lastEventAt` for mais antigo que `thresholds.silenceMinutes` E a instância teve eventos nas últimas 24h (pra não alertar instâncias dormentes) → dispara alerta `webhook_silence`.
- Usa `useRef<Map<instance, lastAlertAt>>` para deduplicar (cooldown de 5min por instância+tipo, não spammar toast a cada poll).
- Respeita `useNotificationSettings` — não toca som em quiet hours, mas mantém toast/browser notification.
- Dispara via:
  - `toast.error(...)` (sonner) — visível na sessão.
  - `playNotificationSound('alert')` quando habilitado e fora de quiet hours.
  - `showBrowserNotification(...)` quando permissão concedida.

#### 2. Painel de configuração de thresholds

Novo componente `src/pages/admin-webhook-secret-status/AlertThresholdsPanel.tsx`:

- Card colapsável "Alertas em tempo real" no final da página.
- Inputs:
  - **% inválido tolerado** (default 5%, 0-100)
  - **Amostra mínima** (default 20 eventos, anti-ruído pra instância nova)
  - **Silêncio máximo (min)** (default 10 min)
  - Switch "Ativar alertas"
- Persistência via `localStorage` usando `safeGetJSON/safeSetJSON` (mesmo padrão de `src/lib/retryAlerts.ts`).
- Helper puro `src/lib/webhookHealthAlerts.ts` com `loadAlertConfig()`, `saveAlertConfig()`, `evaluateInstanceHealth(stats, config)` retornando `{ breached, type, reason }[]`.

#### 3. Integração na página

- `AdminWebhookSecretStatusPage` chama `useWebhookHealthAlerts(config)` no topo.
- Renderiza `<AlertThresholdsPanel />` no fim da página.
- Quando alerta dispara, além do toast, atualiza um badge "⚠️ N alertas ativos" no header da página com lista expansível dos últimos 5 alertas (timestamp + instância + motivo).

#### 4. Mounting global (opcional, mas recomendado)

Para que o admin receba alertas mesmo sem a página aberta, montar o hook também em `AppShell` (similar ao `useConnectionAlertsPush` e `useWarRoomAlerts`), gated por `useUserRole` → só roda para `admin`/`supervisor`.

### Detalhes técnicos

**Arquivos a criar:**

- `src/lib/webhookHealthAlerts.ts` — config + evaluator puros (espelha `src/lib/retryAlerts.ts`).
- `src/lib/__tests__/webhookHealthAlerts.test.ts` — Vitest cobrindo:
  - Spike só dispara acima de `minSampleSize`.
  - Silêncio só dispara se instância teve eventos recentes.
  - Persistência de config (load/save/fallback).
  - Cooldown evita duplicação.
- `src/hooks/useWebhookHealthAlerts.ts` — hook com polling, dedupe, integração com toast/sound/browser notification.
- `src/pages/admin-webhook-secret-status/AlertThresholdsPanel.tsx` — UI de config + lista de alertas recentes.

**Arquivos a editar:**

- `src/pages/AdminWebhookSecretStatusPage.tsx` — montar hook + renderizar painel + badge de alertas ativos no header.
- `src/components/AppShell.tsx` (ou equivalente) — montar `useWebhookHealthAlerts` gated por role admin/supervisor para alertas globais.

**Padrões respeitados:**

- Reuso de `useNotificationSettings` (quiet hours), `playNotificationSound`, `showBrowserNotification`, `toast` (sonner).
- Sem export CSV.
- Tokens semânticos (`text-warning`, `text-destructive`, `bg-warning/10`).
- Cooldown de 5min por instância+tipo para evitar fadiga de alerta.
- `log.warn` de `@/lib/logger` para auditoria interna dos disparos.
- Tipagem estrita, max ~340 linhas/arquivo.

### Fora de escopo

- Persistir alertas no banco (`security_alerts` ou `audit_logs`) — por ora ficam só na sessão; se virar requisito de auditoria, próximo lote pode plugar via `fn_safe_audit_log`.
- Alertas por e-mail/SMS/Slack — fora do escopo (pode entrar via Resend/Webhook num próximo lote).
- Auto-pause da instância quando spike detectado — já existe mecanismo paralelo em `_shared/instance-pause.ts` para auth failures; replicar pra HMAC fica para outro lote.
- Histórico longitudinal de alertas (>sessão atual) — fora do escopo desta entrega.

