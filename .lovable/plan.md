

## Análise Exaustiva — Melhorias Pendentes no ZAPP Web

Realizei varredura cruzada entre código, edge functions, migrações SQL e documentos de auditoria (`IMPROVEMENT_PLAN.md`, `EVOLUTION_API_GAPS_ANALYSIS.md`, `HANDOFF_EVOLUTION_SECURITY_2026-04-12.md`, `FORGOTTEN_FEATURES_REPORT.md`, `AUDITORIA_COMPLETA_ZAPP_WEB.md`). Abaixo estão **as melhorias REAIS pendentes**, agrupadas por prioridade e prontas para serem executadas em sequência (modo autônomo, conforme sua preferência).

---

### 🔴 P0 — Resiliência e Segurança Crítica (Sprint Evolution)

| # | Item | Estado atual | Arquivo-alvo |
|---|------|--------------|--------------|
| 1 | **Retry com exponential backoff em envio de mensagens** | Ausente (`useEvolutionMessaging.ts` envia sem retry) | `src/hooks/evolution/useEvolutionMessaging.ts` + `_shared/evolution-api-proxy.ts` |
| 2 | **Dead-letter queue para mensagens falhas** | Não existe tabela `failed_messages` nem reprocessador | nova migration + `supabase/functions/reprocess-failed-messages/` |
| 3 | **Job pg_cron de reconciliação de mensagens órfãs** | Inexistente | nova migration SQL (4h em 4h) |
| 4 | **Hardening do banner `EvolutionDisconnectBanner`** | Após patch do `EVOLUTION_AUTH_ERROR`, falta cooldown anti-spam de toast e log estruturado | `src/components/alerts/EvolutionDisconnectBanner.tsx` |
| 5 | **Webhook HMAC strict-mode auditável** | Implementado mas roda como "skip se sem secret" — falta painel admin para visualizar status do secret e violação | novo card em `MonitoringWebhookPanel.tsx` |

---

### 🟠 P1 — Eventos Evolution Não Tratados

Identificados em `EVOLUTION_API_GAPS_ANALYSIS.md` mas **ainda não implementados** nos handlers do `evolution-webhook/index.ts`:

| Evento | Funcionalidade que destrava |
|--------|------------------------------|
| `PRESENCE_UPDATE` (enriquecido) | indicador online/offline no header do chat |
| `CONTACTS_UPDATE` | sync automático de avatar/pushName |
| `CHATS_UPDATE` | refletir arquivar/fixar feito no celular |
| `CALL` | gravar chamadas via `rpc_insert_call` |
| `LABELS_ASSOCIATION` | sincronizar labels do WA Business com `evolution_tags` |

**Ação:** estender `_shared/evolution-sync-actions.ts` com handlers dedicados + RPCs do FATOR X já disponíveis (`rpc_upsert_contact`, `rpc_insert_call`).

---

### 🟡 P2 — Itens Falsamente "Concluídos" no IMPROVEMENT_PLAN.md

Cabeçalho do doc declara P2 = 100%, mas o corpo lista 12 pendentes reais (verificado por inspeção):

| ID | Item | Falta |
|----|------|-------|
| 3.10 | VoIP nativa | painel admin de configuração SIP unificado |
| 3.11 | Builder visual de automações | editor drag-and-drop (hoje só lista) |
| 3.12 | NPS periódico | scheduler automático no cron |
| 3.13 | 2FA via Authenticator | finalizar fluxo TOTP (passkey OK, TOTP incompleto) |
| 3.15 | Filtros salvos compartilháveis | persistir presets entre agentes |
| 3.16 | Bulk actions melhorados | seleção múltipla na inbox |
| 3.17 | Atalhos contextuais | command palette estendido por contexto |
| 3.18 | Export automático | bloqueado por política Zero Export — **descartar definitivamente do plano** |

---

### 🟢 P3 — Qualidade, Testes e Documentação

| # | Item | Estado |
|---|------|--------|
| 1 | **CI/CD GitHub Actions** | ausente — workflow lint/test/typecheck |
| 2 | **Testes E2E Playwright** | ausentes — só temos Vitest unitários |
| 3 | **Cobertura Deno tests** para edge functions críticas | parcial — faltam `evolution-webhook`, `whatsapp-webhook`, `talkx-send` |
| 4 | **Documentação consolidada** | 4 docs com status conflitante (`IMPROVEMENT_PLAN`, `EVOLUTION_API_GAPS`, `HANDOFF`, `FORGOTTEN_FEATURES`) — unificar em `docs/STATUS_REAL.md` |
| 5 | **587 ocorrências de "todo/todos"** falso-positivo (texto PT-BR) | nenhuma TODO/FIXME real encontrada — adicionar lint rule para distinguir |

---

### 📊 Resumo Executivo

```text
┌─────────────────────────────────────────────────────┐
│  Total de melhorias REAIS pendentes:  22            │
├─────────────────────────────────────────────────────┤
│  P0 (crítico)                          5            │
│  P1 (eventos Evolution)                5            │
│  P2 (UX avançada)                      7            │
│  P3 (qualidade/docs)                   5            │
└─────────────────────────────────────────────────────┘
```

---

### 🛠️ Plano de Execução Sequencial (modo autônomo)

Após aprovação, executarei **uma melhoria por vez**, em ordem rigorosa do P0 ao P3, sem pedir confirmações intermediárias, conforme sua preferência registrada (`.lovable/user-preferences`).

**Ordem proposta:**

1. P0.1 → Retry exponential backoff (`evolution-api-proxy.ts`)
2. P0.2 → Tabela `failed_messages` + edge function reprocessador
3. P0.3 → Migration `pg_cron` reconciliação
4. P0.4 → Hardening `EvolutionDisconnectBanner` (cooldown + log)
5. P0.5 → Card admin de status do `WEBHOOK_SECRET`
6. P1.1–5 → Handlers de eventos Evolution (`PRESENCE/CONTACTS/CHATS/CALL/LABELS`)
7. P2.10–17 → UX avançada (excluindo 3.18 Export)
8. P3.1–4 → CI/CD, testes E2E, Deno tests, doc unificado

### Detalhes técnicos por melhoria (resumo de cada arquivo afetado)

- **Retry/backoff:** wrapper `withRetry(fn, { maxRetries: 3, baseDelay: 500, jitter: true })` em `_shared/evolution-api-proxy.ts`. Aplicado a `proxyToEvolution`. Não tocará em rotas de `connect` (evita loop em 401).
- **DLQ:** `failed_messages(id, payload jsonb, error_code, retry_count, last_attempt_at, status, created_at)` com RLS admin-only. Edge function `reprocess-failed-messages` chamada por cron a cada 15min, máx 5 retries.
- **Reconciliação:** `pg_cron` executa `fn_reconcile_orphan_messages()` 4/4h, comparando `evolution_messages.message_id` com payload bruto recebido em `evolution_audit_log`.
- **Banner:** adicionar `Map<string, number>` de cooldown 30s por instance_id, log via `getLogger('EvolutionBanner')`.
- **Eventos Evolution:** cada handler usa RPCs FATOR X já existentes (`rpc_upsert_contact`, `rpc_insert_call`); `LABELS_ASSOCIATION` faz upsert em `evolution_tags` com `external_label_id`.
- **VoIP/Builder/NPS/2FA TOTP:** componentes novos sob `src/components/{voip,automations,nps,security}/`, sem alterar schema existente.
- **CI/CD:** `.github/workflows/ci.yml` rodando `pnpm lint && pnpm test && pnpm typecheck`.
- **Doc unificado:** `docs/STATUS_REAL.md` substituirá os 4 docs conflitantes (mantidos como histórico em `docs/_archive/`).

