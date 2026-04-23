# ZAPP Web — Status Real (consolidado)

> Documento único de verdade. Substitui `IMPROVEMENT_PLAN.md`, `EVOLUTION_API_GAPS_ANALYSIS.md`, `HANDOFF_EVOLUTION_SECURITY_2026-04-12.md` e `FORGOTTEN_FEATURES_REPORT.md`. Esses arquivos passam a histórico em `docs/_archive/` (movimento opcional).

Última atualização: **2026-04-23** (auditoria + execução P0→P3 do sprint Evolution).

---

## ✅ Concluído nesta sprint

### P0 — Resiliência e Segurança Crítica

| # | Item | Onde | Notas |
|---|------|------|-------|
| 1 | Retry exponential backoff com **jitter** | `supabase/functions/_shared/evolution-api-proxy.ts` | Aplicado a GET/PUT/DELETE (idempotentes). POST mantém envio único para evitar duplicidade. |
| 2 | **Dead-letter queue** `failed_messages` | migration + `supabase/functions/reprocess-failed-messages/` | RLS admin-only. 5 tentativas máx. Backoff exponencial até 1h entre tentativas. |
| 3 | Cron de reprocessamento DLQ | `pg_cron` job `reprocess-failed-messages-15min` | A cada 15 min. |
| 4 | Hardening do banner Evolution | `src/components/alerts/EvolutionDisconnectBanner.tsx` | Cooldown de 30s por instância + `getLogger('EvolutionBanner')`. |
| 5 | Painel de status do `WEBHOOK_SECRET` | `supabase/functions/webhook-secret-status/` + `src/components/monitoring/MonitoringWebhookPanel.tsx` | Mostra apenas comprimento + 4 bytes do hash SHA-256. Nunca expõe o segredo. |

### P1 — Eventos Evolution

Verificado por inspeção em `supabase/functions/_shared/evolution-webhook-handlers.ts` e `supabase/functions/evolution-webhook/index.ts`:

| Evento | Handler | Roteado |
|--------|---------|---------|
| `PRESENCE_UPDATE` | `handlePresenceUpdate` (linha 178) | ✅ |
| `CONTACTS_UPDATE` / `UPSERT` / `SET` | `handleContactsUpsert/Set` | ✅ |
| `CHATS_UPDATE` / `DELETE` / `SET` | `handleChatsUpdate/Delete/Set` | ✅ |
| `CALL` | `handleCallEvent` | ✅ |
| `LABELS_ASSOCIATION` / `EDIT` | `handleLabelsAssociation/Edit` | ✅ |

**Conclusão:** documento de gaps anterior estava desatualizado — todos os handlers já existiam.

### P2 — UX avançada

Auditoria revelou que 6 dos 7 itens já estão implementados:

| ID | Item | Status real |
|----|------|-------------|
| 3.10 | VoIP painel SIP | ✅ `VoIPPanel.tsx` + `useSipClient` + testes |
| 3.11 | Builder visual de automações | ❌ **Pendente** — épico próprio (requer ReactFlow + editor de nodes) |
| 3.12 | NPS scheduler automático | ✅ **Implementado nesta sprint** — `nps-scheduler` + cron diário 14h UTC + tabela `nps_invitations` |
| 3.13 | 2FA TOTP | ✅ `MFAEnroll/Verify/Settings` via Supabase Auth |
| 3.15 | Filtros compartilháveis | ✅ `useSavedFilters` com `is_shared` |
| 3.16 | Bulk actions | ✅ `BulkActionsBar/Toolbar` + `useBulkActions/useInboxBulkActions` |
| 3.17 | Atalhos contextuais | ✅ `CommandPalette` + `GlobalKeyboardProvider` |
| 3.18 | Export automático | ❌ Bloqueado por política Zero Export — descartado |

### P3 — Qualidade

| # | Item | Status |
|---|------|--------|
| 1 | CI/CD GitHub Actions | ✅ `.github/workflows/ci.yml` já existente — lint, typecheck, vitest+coverage, deno tests (evolution-api + public-api), build com bundle report, npm audit + scan de secrets. |
| 2 | E2E Playwright | ❌ **Pendente** — épico próprio |
| 3 | Deno tests para `evolution-webhook`/`whatsapp-webhook`/`talkx-send` | 🟡 Parcial — coberturas adicionais ficam como melhoria contínua |
| 4 | Documentação consolidada | ✅ Este arquivo |

---

## 🟡 Pendências reconhecidas (épicos próprios)

| Item | Esforço estimado | Por que não foi feito agora |
|------|-----------------|------------------------------|
| Builder visual de automações (3.11) | Sprint dedicado | Requer instalar ReactFlow, modelar nodes/edges em JSON, validar contra o schema atual de `automations.actions`. |
| E2E Playwright | Sprint dedicado | Setup do runner, fixtures de auth, mocks de Evolution API, integração com CI. |
| Reconciliação de mensagens órfãs (cron banco externo FATOR X) | 1 dia | `pg_cron` local não consegue consultar tabelas do Supabase externo; precisa edge function dedicada que faça `fetch` no banco externo, comparando `evolution_messages.message_id` vs payloads de `evolution_audit_log`. |

---

## 🔑 Operações úteis (cheatsheet)

```sql
-- Ver fila de mensagens falhas
SELECT id, instance_name, status, retry_count, error_message, last_attempt_at
  FROM public.failed_messages
 WHERE status IN ('pending','retrying') ORDER BY created_at DESC LIMIT 50;

-- Forçar reprocessamento manual (admin)
SELECT net.http_post(
  url := 'https://allrjhkpuscmgbsnmjlv.supabase.co/functions/v1/reprocess-failed-messages',
  headers := jsonb_build_object('Content-Type','application/json'),
  body := jsonb_build_object('source','manual')
);

-- Listar jobs cron ativos
SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
```

---

## 🗂️ Documentos arquivados

Os seguintes documentos contêm informações historicamente úteis mas estavam desatualizados/conflitantes. Use **este** arquivo como referência atual:

- `docs/IMPROVEMENT_PLAN.md`
- `docs/EVOLUTION_API_GAPS_ANALYSIS.md`
- `docs/HANDOFF_EVOLUTION_SECURITY_2026-04-12.md`
- `docs/FORGOTTEN_FEATURES_REPORT.md`
- `docs/AUDITORIA_COMPLETA_ZAPP_WEB.md`
