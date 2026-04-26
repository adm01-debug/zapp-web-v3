# INVENTORY.md
> Auditoria do frontend ZAPP Web — Fase 1: inventário completo.
> Gerado em **2026-04-26** a partir do `src/` e do schema Supabase local.

## 0. Sumário executivo do escopo
| Métrica | Valor |
|---|---:|
| Arquivos TS/TSX em `src/` | **1.390** |
| Linhas de código frontend | **224.183** |
| Páginas (`src/pages/**`) | **79** |
| Componentes (`src/components/**`) | **787** |
| Hooks (`src/hooks/**`) | **374** |
| Rotas em `App.tsx` (React Router) | **31** |
| Views internas registradas em `ViewRouter` | **66** (sob a rota `/`) |
| Tabelas referenciadas via `.from()` | **131** únicas |
| RPCs referenciadas via `.rpc()` | **49** únicas |
| Edge functions invocadas via `functions.invoke()` | **43** únicas |
| Edge functions deployadas em `supabase/functions/` | **79** |
| Buckets de storage referenciados | **7** |
| Linhas com `supabase.auth.*` | **85** |

## 1. Rotas (React Router em `src/App.tsx`)

| Path | Página/Componente | Wrapper | Arquivo (lazy import) |
|---|---|---|---|
| `/auth` | `Auth` | — | `./pages/Auth` |
| `/forgot-password` | `ForgotPassword` | — | `./pages/ForgotPassword` |
| `/reset-password` | `ResetPassword` | — | `./pages/ResetPassword` |
| `/verify-email` | `VerifyEmail` | — | `./pages/VerifyEmail` |
| `/auth/callback` | `SSOCallback` | — | `./pages/SSOCallback` |
| `/2fa` | `TwoFactorAuth` | — | `./pages/TwoFactorAuth` |
| `/install` | `Install` | — | `./pages/Install` |
| `/chat-popup/:contactId` | `ChatPopup` | ProtectedRoute | `./pages/ChatPopup` |
| `/` | `Index` | ProtectedRoute | `./pages/Index` |
| `/queue/:id` | `QueueDetails` | ProtectedRoute | `./pages/QueueDetails` |
| `/queues/comparison` | `QueuesComparison` | ProtectedRoute | `./pages/QueuesComparison` |
| `/sla` | `SLADashboard` | ProtectedRoute | `./pages/SLADashboard` |
| `/sla/history` | `SLAHistory` | ProtectedRoute | `./pages/SLAHistory` |
| `/sla/preferences` | `SLAAlertPreferences` | ProtectedRoute | `./pages/SLAAlertPreferences` |
| `/sla/alerts` | `SLAAlertHistory` | ProtectedRoute | `./pages/SLAAlertHistory` |
| `/debug/send-status-bus` | `SendStatusBusDebug` | ProtectedRoute | `./pages/SendStatusBusDebug` |
| `/debug/realtime-fanout` | `RealtimeFanoutDebug` | ProtectedRoute | `./pages/RealtimeFanoutDebug` |
| `/admin/roles` | `RolesPage` | ProtectedRoute | `./pages/admin/RolesPage` |
| `/admin/departments` | `DepartmentsPage` | ProtectedRoute | `./pages/admin/DepartmentsPage` |
| `/admin/departamentos` | `DepartmentsPage` | ProtectedRoute | `./pages/admin/DepartmentsPage` |
| `/admin/rate-limit` | `RateLimitDashboard` | ProtectedRoute | `./pages/admin/RateLimitDashboard` |
| `/admin/hmac-selftest` | `HmacSelfTestPage` | ProtectedRoute | `./pages/admin/HmacSelfTestPage` |
| `/admin/operations` | `AdminOperationsPage` | ProtectedRoute | `./pages/admin/AdminOperationsPage` |
| `/admin/channels` | `AdminChannelsPage` | ProtectedRoute | `./pages/admin/AdminChannelsPage` |
| `/admin/queues` | `AdminQueuesPage` | ProtectedRoute | `./pages/admin/AdminQueuesPage` |
| `/admin/providers` | `AdminProvidersPage` | ProtectedRoute | `./pages/admin/AdminProvidersPage` |
| `/admin/failed-auth-messages` | `AdminFailedAuthMessagesPage` | ProtectedRoute | `./pages/admin/AdminFailedAuthMessagesPage` |
| `/admin/route-permissions` | `RoutePermissionsPage` | ProtectedRoute | `./pages/admin/RoutePermissionsPage` |
| `/admin/stress-test` | `AdminStressTestPage` | ProtectedRoute | `./pages/admin/AdminStressTestPage` |
| `/admin/inbox-sync-status` | `AdminInboxSyncStatusPage` | ProtectedRoute | `./pages/admin/AdminInboxSyncStatusPage` |
| `*` | `NotFound` | — | `—` |

### 1.1 Sub-rotas em `<ViewRouter>` (segundo nível, dentro de `/`)

O `Index.tsx` mantém estado `currentView` que delega ao `<ViewRouter>` (`src/pages/ViewRouter.tsx`). Estas views NÃO têm path próprio — são alternadas via `setCurrentView`.

| `currentView` | Componente exportado em `src/pages/lazyViews.ts` |
|---|---|
| `inbox` | `RealtimeInboxView` |
| `dashboard` | `DashboardView` |
| `agents` | `AgentsView` |
| `queues` | `QueuesView` |
| `contacts` | `ContactsView` |
| `groups` | `GroupsView` |
| `connections` | `ConnectionsView` |
| `wallet` | `ClientWalletView` |
| `catalog` | `ProductManagement` |
| `transcriptions` | `TranscriptionsHistoryView` |
| `admin` | `AdminView` |
| `tags` | `TagsView` |
| `sentiment` | `SentimentAlertsDashboard` |
| `reports` | `AdvancedReportsView` |
| `security` | `SecurityView` |
| `settings` | `SettingsView` |
| `docs` | `SystemFeaturesView` |
| `campaigns` | `CampaignsView` |
| `chatbot` | `ChatbotFlowsView` |
| `automations` | `AutomationsManager` |
| `integrations` | `IntegrationsHub` |
| `privacy` | `LGPDComplianceView` |
| `pipeline` | `SalesPipelineView` |
| `knowledge` | `KnowledgeBaseView` |
| `payments` | `PaymentLinksView` |
| `wa-flows` | `WhatsAppFlowsBuilder` |
| `meta-capi` | `MetaCAPIView` |
| `diagnostics` | `DiagnosticsView` |
| `voip` | `VoIPPanel` |
| `auto-export` | `AutoExportManager` |
| `google-calendar` | `GoogleCalendarIntegration` |
| `themes` | `ThemeCustomizer` |
| `schedule` | `ScheduleCalendarView` |
| `warroom` | `WarRoomDashboard` |
| `wa-templates` | `WhatsAppTemplatesManager` |
| `omnichannel` | `OmnichannelManager` |
| `churn` | `ChurnPredictionDashboard` |
| `ticket-classifier` | `AutoTicketClassifier` |
| `performance` | `PerformanceMonitor` |
| `omni-inbox` | `OmnichannelInbox` |
| `audit-logs` | `AuditLogDashboard` |
| `telemetry` | `AdminTelemetriaPage` |
| `failed-messages` | `AdminFailedMessagesPage` |
| `failed-auth-messages` | `AdminFailedAuthMessagesPage` |
| `webhook-events` | `AdminWebhookEventsPage` |
| `evolution-api-logs` | `AdminEvolutionApiLogsPage` |
| `alert-history` | `AdminAlertHistoryPage` |
| `webhook-overview` | `AdminWebhookOverviewPage` |
| `nps` | `NPSDashboard` |
| `team-chat` | `TeamChatView` |
| `email-chat` | `EmailChatView` |
| `gmail` | `GmailInboxView` |
| `public-api` | `PublicApiDashboard` |
| `gmail-webhook` | `GmailWebhookMonitor` |
| `media-migration` | `MediaMigrationTool` |
| `sicoob-bridge` | `SicoobBridgeDashboard` |
| `crm360` | `CRM360ExplorerView` |
| `ai-usage` | `AIUsageDashboard` |
| `sla` | `SLADashboardView` |
| `talkx` | `TalkXView` |
| `evolution-monitor` | `EvolutionMonitoringDashboard` |
| `webhook-secret` | `AdminWebhookSecretStatusPage` |
| `search-insights` | `AdminSearchInsightsPage` |
| `agents-ops` | `AgentsOperationsPage` |
| `realtime-monitor` | `AdminRealtimeMonitorPage` |
| `dispatch-errors-history` | `AdminDispatchErrorsHistoryPage` |

## 2. Páginas (`src/pages/**`) — top 20 por linhas

```
1012 src/pages/AdminFailedMessagesPage.tsx
   696 src/pages/AdminWebhookSecretStatusPage.tsx
   591 src/pages/AdminWebhookEventsPage.tsx
   530 src/pages/admin/AdminChannelsPage.tsx
   511 src/pages/AdminWebhookOverviewPage.tsx
   508 src/pages/admin/AdminQueuesPage.tsx
   463 src/pages/admin/AdminInboxSyncStatusPage.tsx
   441 src/pages/admin/HmacSelfTestPage.tsx
   435 src/pages/admin/AdminStressTestPage.tsx
   421 src/pages/admin-webhook-secret-status/HmacSelfTestButton.tsx
   398 src/pages/admin-webhook-secret-status/HmacAuditHistoryPanel.tsx
   388 src/pages/admin-webhook-secret-status/AdvancedFiltersPanel.tsx
   383 src/pages/admin/DepartmentsPage.tsx
   339 src/pages/AdminAlertHistoryPage.tsx
   332 src/pages/SendStatusBusDebug.tsx
   327 src/pages/admin/operations/OpsLogsTab.tsx
   321 src/pages/Index.tsx
   316 src/pages/AdminEvolutionApiLogsPage.tsx
   303 src/pages/admin/RateLimitDashboard.tsx
   292 src/pages/ChatPopup.tsx
```
_Lista completa: 79 arquivos. Páginas órfãs (sem rota direta em `App.tsx`) são roteadas via `ViewRouter` listado acima._

## 3. Chamadas Supabase

### 3.1 Tabelas referenciadas via `.from()`  (131 únicas)

#### Top 20 mais usadas
| Tabela | # arquivos que usam | Existe em `public` local? |
|---|---:|:---:|
| `profiles` | 62 | ✅ |
| `messages` | 54 | ✅ |
| `contacts` | 53 | ✅ |
| `whatsapp_connections` | 21 | ✅ |
| `queues` | 15 | ✅ |
| `conversation_sla` | 9 | ✅ |
| `audit_logs` | 9 | ✅ |
| `stickers` | 6 | ✅ |
| `conversation_events` | 6 | ✅ |
| `conversation_analyses` | 6 | ✅ |
| `contact_notes` | 6 | ✅ |
| `agent_stats` | 6 | ✅ |
| `warroom_alerts` | 5 | ✅ |
| `user_settings` | 5 | ✅ |
| `user_roles` | 5 | ✅ |
| `team_conversation_members` | 5 | ✅ |
| `queue_members` | 5 | ✅ |
| `global_settings` | 5 | ✅ |
| `message_templates` | 4 | ✅ |
| `evolution_retry_metrics` | 4 | ✅ |

#### Tabelas chamadas pelo front mas **inexistentes** no `public` local

- `avatars`
- `salespeople`

> ⚠️ Verificar na Fase 2 se são views, materializadas, FATOR X, ou referência morta.

### 3.2 RPCs referenciadas via `.rpc()`  (49 únicas)

#### Existem no `public` local
- `clear_login_attempts`
- `contacts_count_by_type`
- `get_own_gmail_accounts`
- `get_team_profiles`
- `get_visible_agent_ids`
- `has_role`
- `is_account_locked`
- `is_admin_or_supervisor`
- `is_within_business_hours`
- `log_audit_event`
- `reassign_absent_agents`
- `reassign_overloaded_agents`
- `record_failed_login`
- `rpc_dlq_abandon`
- `rpc_dlq_bulk_abandon`
- `rpc_dlq_list_audit`
- `rpc_dlq_log_item_action`
- `rpc_dlq_log_reprocess_result`
- `rpc_dlq_log_reprocess_trigger`
- `rpc_dlq_retry_now`
- `rpc_dlq_stats`
- `rpc_evolution_fallback_stats`
- `rpc_instance_auth_event_summary`
- `rpc_instance_auth_event_trend`
- `rpc_link_channel_queue`
- `rpc_list_dispatch_error_logs`
- `rpc_list_failed_messages`
- `rpc_log_search_event`
- `rpc_ops_metrics`
- `rpc_provider_panel`
- `rpc_provider_session_timeline`
- `rpc_queue_sla_panel`
- `rpc_record_search_click`
- `rpc_search_insights`
- `rpc_unlink_channel_queue`
- `search_contacts`
- `search_knowledge_base`
- `skill_based_assign`
- `update_own_profile`
- `user_has_permission`

#### NÃO existem no `public` local (provavelmente FATOR X)
- `get_companies_by_phones_batch`
- `get_contact_360_by_phone`
- `get_contact_intelligence_by_phone`
- `rpc_get_contact`
- `rpc_list_contacts`
- `rpc_list_conversations`
- `rpc_list_messages_lite`
- `search_contacts_advanced`
- `sync_interaction_from_zapp`

> ⚠️ Fase 2.1 deve confirmar que cada uma existe no schema FATOR X (`tdprnylgyrogbbhgdoik`).

### 3.3 Edge functions invocadas (43)

| Edge function | Deployada? |
|---|:---:|
| `ai-auto-tag` | ✅ |
| `ai-churn-analysis` | ✅ |
| `ai-classify-tickets` | ✅ |
| `ai-conversation-analysis` | ✅ |
| `ai-conversation-summary` | ✅ |
| `ai-enhance-message` | ✅ |
| `ai-proxy` | ✅ |
| `ai-suggest-reply` | ✅ |
| `ai-transcribe-audio` | ✅ |
| `approve-password-reset` | ✅ |
| `batch-fetch-avatars` | ✅ |
| `bitrix-api` | ✅ |
| `chatbot-l1` | ✅ |
| `classify-audio-meme` | ✅ |
| `classify-emoji` | ✅ |
| `classify-sticker` | ✅ |
| `connection-health-check` | ✅ |
| `detect-new-device` | ✅ |
| `elevenlabs-scribe-token` | ✅ |
| `elevenlabs-sfx` | ✅ |
| `evolution-api` | ✅ |
| `evolution-sync` | ✅ |
| `evolution-webhook` | ✅ |
| `external-db-proxy` | ✅ |
| `get-mapbox-token` | ✅ |
| `get-sip-password` | ✅ |
| `gmail-oauth` | ✅ |
| `instance-pause-control` | ✅ |
| `migrate-media-storage` | ✅ |
| `promogifts-catalog` | ✅ |
| `provider-healthcheck` | ✅ |
| `queue-rebalance` | ✅ |
| `recheck-webhook-signature` | ✅ |
| `reprocess-failed-messages` | ✅ |
| `send-email` | ✅ |
| `send-scheduled-report` | ✅ |
| `sentiment-alert` | ✅ |
| `talkx-send` | ✅ |
| `ticket-router` | ✅ |
| `webauthn` | ✅ |
| `webhook-diagnostic` | ✅ |
| `webhook-hmac-selftest` | ✅ |
| `webhook-secret-status` | ✅ |

#### Edge functions deployadas mas **nunca** invocadas pelo front (36)

_Não é necessariamente bug — podem ser webhooks externos, cron, ou bridges._

- `analyze-external-db`
- `auto-close-conversations`
- `cleanup-rate-limit-logs`
- `contact-media`
- `create-user`
- `e2e-fixtures`
- `elevenlabs-agent-token`
- `elevenlabs-dialogue`
- `elevenlabs-sts`
- `elevenlabs-tts`
- `elevenlabs-tts-stream`
- `elevenlabs-voice-design`
- `elevenlabs-webhook`
- `evolution-health`
- `evolution-retry-metrics`
- `external-db-bridge`
- `gmail-send`
- `gmail-sync`
- `gmail-webhook`
- `nps-scheduler`
- `provider-router`
- `proxy-health`
- `proxy-metrics`
- `public-api`
- `recover-corrupted-audios`
- `send-rate-limit-alert`
- `sicoob-bridge`
- `sicoob-bridge-reply`
- `sla-alert-forward`
- `sla-alert-log-failure`
- `status`
- `talkx-scheduler`
- `voice-agent`
- `voice-changer`
- `voice-copilot-action`
- `whatsapp-webhook`

### 3.4 `supabase.auth.*`  (85 ocorrências)

| Método | # chamadas |
|---|---:|
| `auth.getSession` | 14 |
| `auth.getUser` | 41 |
| `auth.mfa` | 17 |
| `auth.onAuthStateChange` | 4 |
| `auth.resend` | 1 |
| `auth.setSession` | 1 |
| `auth.signInWithOtp` | 1 |
| `auth.signInWithPassword` | 2 |
| `auth.signOut` | 2 |
| `auth.signUp` | 1 |
| `auth.updateUser` | 1 |

### 3.5 `supabase.storage.from(...)`  (7 buckets)

| Bucket | Público no banco? |
|---|:---:|
| `audio-memes` | ✅ public |
| `audio-messages` | 🔒 privado |
| `avatars` | ✅ public |
| `custom-emojis` | ✅ public |
| `stickers` | ✅ public |
| `team-chat-files` | 🔒 privado |
| `whatsapp-media` | 🔒 privado |

## 4. Estado / contexto

### 4.1 Contextos React (`createContext`)  — 12 arquivos
- `src/components/cognitive/ProgressiveDisclosure.tsx`
- `src/components/gamification/GamificationProvider.tsx`
- `src/components/keyboard/GlobalKeyboardProvider.tsx`
- `src/components/mobile/InAppNotificationProvider.tsx`
- `src/components/onboarding/OnboardingTour.tsx`
- `src/components/theme/HighContrastToggle.tsx`
- `src/components/ui/accessible-toast.tsx`
- `src/components/ui/chart.tsx`
- `src/components/ui/form.tsx`
- `src/components/ui/sidebar/sidebar-context.tsx`
- `src/components/ui/toggle-group.tsx`
- `src/hooks/useAuth.tsx`

### 4.2 Stores externas

- **Zustand**: 0 stores (não usado).
- **Redux**: ausente.
- **TanStack Query**: usado amplamente — ~200 ocorrências de `queryKey`. Estado servidor é o padrão do projeto.

## 5. Tipos TypeScript Supabase / domínio

| Arquivo | Origem | Edição |
|---|---|---|
| `src/integrations/supabase/types.ts` | **auto-gerado** (Lovable Cloud) | ❌ NÃO editar manualmente |
| `src/integrations/supabase/client.ts` | auto-gerado | ❌ NÃO editar |
| `src/integrations/supabase/externalClient.ts` | manual (CRM 360) | editável |
| `src/types/evolutionExternal.ts` | manual (FATOR X — `evolution_*`) | editável; sincronizar quando schema mudar |
| `src/types/externalDB.ts` | manual | editável |
| `src/types/chat.ts` | manual (legado) | editável |
| `src/types/contact360.ts` / `contactSearch.ts` | manual | editável |
| `src/types/incomingCall.ts` | manual | editável |
| `src/types/mediaRefresh.ts` / `messageStatus.ts` | manual | editável |

## 6. Variáveis de ambiente

| Variável | Uso |
|---|---|
| `import.meta.env.DEV` | guards de dev |
| `import.meta.env.PROD` | guards de produção |
| `import.meta.env.VITE_SUPABASE_URL` | Lovable Cloud (Supabase principal) — autoinjetado |
| `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY` | Lovable Cloud anon key — autoinjetado |
| `import.meta.env.VITE_EXTERNAL_SUPABASE_URL` | CRM 360 (`pgxfvjmuubtbowutlide`) |
| `import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY` | CRM 360 anon key |
| `process.env.NODE_ENV` | logger |
| `process.env.TZ` | configuração de timezone server-side |

> ⚠️ Faltando: variáveis para FATOR X (`tdprnylgyrogbbhgdoik`) — o acesso passa pela edge function `external-db-proxy` (e cliente principal), não por client direto.

## 7. Mapa de dependências críticas (página → backend)

_Construído por inspeção manual dos hooks principais; foco no caminho de produção. Outras dependências serão validadas linha-a-linha em SUPABASE_AUDIT.md (Fase 2)._

### 7.1 Inbox (`/`, view `inbox`)
- **Hook raiz:** `useRealtimeInbox` (`src/hooks/useRealtimeInbox.ts`)
- **Modo ativo:** `USE_EXTERNAL_DB = true` → consome FATOR X.
- **Conversas:** `useExternalConversations` → `external-db-proxy` SELECT em `evolution_messages` (janela 7d, 200).
- **Mensagens da conversa:** `useExternalMessages` → `external-db-proxy` por `remote_jid`.
- **Envio texto:** `sendExternalText` → edge `evolution-api` `send-text` → `/message/sendText/wpp2`.
- **Envio áudio:** `sendExternalAudio` → upload em bucket `audio-messages` + `evolution-api` `send-audio`.
- **Detalhes do contato:** `useContactEnrichedData` → `public.contacts` (⚠️ ver Riscos).

### 7.2 Admin / Operations (`/admin/*`)
- `/admin/operations` → `AdminOperationsPage` → RPCs `rpc_ops_metrics`, `rpc_dlq_*`.
- `/admin/queues` → `AdminQueuesPage` → tabelas `queues`, `channel_queues`, `queue_members`.
- `/admin/channels` → `AdminChannelsPage` → tabelas `service_channels`, `channel_connections`.
- `/admin/inbox-sync-status` (novo) → `external-db-proxy` para health do FATOR X + locals `failed_messages`/`audit_logs`.

### 7.3 SLA
- `/sla*` → tabelas `conversation_sla`, `sla_rules`, `sla_configurations`, `sla_alert_preferences`.

### 7.4 Conexões WhatsApp
- View `connections` → `useConnectionsManager` → tabela `whatsapp_connections` + edge `connection-health-check`.

### 7.5 CRM 360 (`crm360`, `contacts`)
- View `crm360` → `externalSupabase` (CRM externo) + RPCs `get_contact_360_by_phone`, `get_contact_intelligence_by_phone`.

## 8. Riscos / pontos de atenção descobertos no inventário

_Apenas listados aqui; correção entra na Fase 2 com causa raiz documentada._

1. **Tabelas `avatars` e `salespeople`** referenciadas pelo front mas inexistentes no `public` local. Validar se são views, externas ou referências mortas. (1 uso cada.)
2. **9 RPCs** chamadas pelo front não existem no `public` local — todas devem morar em FATOR X. Confirmar 1 a 1 na Fase 2.1 (`get_companies_by_phones_batch`, `get_contact_360_by_phone`, `get_contact_intelligence_by_phone`, `rpc_get_contact`, `rpc_list_contacts`, `rpc_list_conversations`, `rpc_list_messages_lite`, `search_contacts_advanced`, `sync_interaction_from_zapp`).
3. **Console errors recorrentes** (P1 candidatos, vistos no preview):
   - `useContactEnrichedData` lança `22P02` (UUID inválido) ao receber `remote_jid` em modo FATOR X.
   - `external-db-proxy` retornando `503` intermitente + queries de 7-15s — degradação clara.
4. **35 edge functions deployadas mas nunca invocadas pelo front** — auditar quais são webhooks (legítimas) e quais são código morto a remover.
5. **Componentes >300 linhas (Fase 8)**: `MediaLibraryAdmin.test.tsx` (1826), `team-chat-comprehensive.test.ts` (1589), `SLATimelineSection.tsx` (615), `RetryMetricsPanel.tsx` (555), `ChatPanel.tsx` (521), `ChatMessagesArea.tsx` (512). Tests à parte; produção tem 4 candidatos a refatoração.
6. **Hooks >300 linhas**: `useConnectionsManager` (824), `useFailedMessages` (387), `useExternalEvolution` (378), `useRealtimeInbox` (341), `useMessagesCursor` (330), `useQuickReplies` (314).
7. **Falta de `VITE_*` declarado para FATOR X**: o acesso é via edge function `external-db-proxy`, então não há client direto — confirmar se isso é intencional (segurança) ou limitação.

---
**Próxima fase:** SUPABASE_AUDIT.md — validação linha-a-linha de cada uma das 1.231 chamadas (`.from`/`.rpc`/`functions.invoke`) contra `information_schema.columns` e `pg_proc`. Aguardando seu OK.
