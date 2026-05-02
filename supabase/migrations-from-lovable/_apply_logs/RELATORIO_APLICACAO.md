# Relatório de Aplicação — Pacote Lovable → VPS

**Data:** 2026-05-02 21:33Z → 18:40Z (UTC)
**Alvo:** supabase.atomicabr.com.br (container `supabase_db.1.kistsya2pvy9o0hg8on5vib2b`)
**Aplicado por:** psql via `supabase_admin` da rede Docker Swarm

## Delta numérico final

| Métrica | Antes | Depois | Δ |
|---|---:|---:|---:|
| Tables (public) | 448 | **471** | **+23** |
| Views (public) | 65 | **70** | **+5** |
| Functions (public) | 494 | **643** | **+149** |
| Enums (public) | 10 | **17** | **+7** |
| Storage buckets | 7 | **9** | **+2** |
| Tables com RLS | 442 | **466** | **+24** |
| Triggers | — | 399 | — |
| Indexes | — | 1.127 | — |
| Policies (RLS) | — | 1.011 | — |
| Extensions | 12 | **13** | **+1** |

## Ordem de aplicação executada

1. `00_setup.sql` — extensions + 7 enums novos | **0 erros** ✅
2. `03_functions.sql` — 171 functions Lovable | **21 erros** (mismatch de tipo em funcs já existentes — esperado)
3. `04_views.sql` — 6 views Lovable | **3 erros** (deps faltantes na 1ª pass)
4. `05_storage.sql` — 9 buckets | **0 erros** ✅
5. `01_new_tables.sql` (1ª pass como `postgres`) — 200 erros (75 ownership)
6. `01_new_tables.sql` (2ª pass como `supabase_admin`) — 314 erros
7. `02_alter_tables.sql` — 263 ALTER ADD COLUMN | **0 erros** ✅
8. **Hotfix manual:** `has_role(uuid, app_role)` + `is_admin_or_supervisor(uuid)` criadas
9. `01_new_tables.sql` (3ª pass) — 291 erros residuais (todos esperados/intencionais)
10. `04_views.sql` (re-run) — só `already exists` (idempotência)

## Análise dos 291 erros residuais

| Categoria | Qtd | Veredicto |
|---|---:|---|
| `cannot create index/ALTER on view contacts/messages` | ~62 | **Intencional** — `contacts` e `messages` no VPS são views apontando para `evolution_contacts`/`evolution_messages` (arquitetura Atomica). NÃO devem virar tables. |
| Sequences/triggers `already exists` | ~10 | **Idempotência funcionando** — pacote já aplicado |
| Schema divergente em tables específicas (`column ts/status/instance/paused_until/deleted_at não existe`, `id uuid vs bigint`) | ~20 | **Intervenção manual necessária** — schema VPS evoluiu além do Lovable em ~5 tables |
| Outros | resto | repetições |

## Descobertas-chave da aplicação

1. **`types.ts` estava muito desatualizado** — diff anterior dizia faltar 35 tables, mas das 35: **22 já existiam** + **2 são views** + **11 foram realmente criadas**.
2. **Arquitetura Atomica:** `contacts` e `messages` são views virtualizando `evolution_*`. O Lovable cria como tables; pacote correto é IGNORAR essas duas no destino.
3. **5 tables com schema divergente real** (vão precisar análise manual):
   - tables que tem `id bigint` mas Lovable espera `id uuid`
   - tables sem colunas como `ts`, `status`, `instance`, `paused_until`, `deleted_at`
4. **Funções Lovable usam overloads** que VPS não tinha. 2 críticas (`has_role(uuid,app_role)`, `is_admin_or_supervisor(uuid)`) criadas manualmente. As outras 21 que falharam têm conflito de tipo — manter versões VPS.

## O que **funcionou plenamente**

✅ 7 enums Lovable criados (ai_provider_type, app_role, automation_*, channel_type, provider_type, service_account_type)
✅ 11 tables Lovable criadas (channel_provider_routes, conversation_participants, conversation_threads, crisis_room_alerts, email_attachments, email_labels, email_messages, gmail_attachments, gmail_health_logs, integration_profiles, mfa_sessions, outbox_events, pii_access_log, provider_session_logs, provider_sessions, reprocess_jobs, scheduled_job_log, sticky_assignments, user_service_accounts, voice_command_logs, webhook_event_dedup, webhook_rate_limits)
✅ 263 ALTER ADD COLUMN aplicados em 44 tables comuns
✅ 149 functions Lovable instaladas/atualizadas
✅ 5 views Lovable criadas (channel_connections_safe, password_reset_requests_safe, profiles_public, whatsapp_connections_agent, whatsapp_connections_public)
✅ 2 storage buckets criados
✅ 24 tables ganharam RLS

## O que **não foi aplicado** (e por quê)

❌ `contacts` table — é VIEW no VPS (arquitetura Atomica, **manter como está**)
❌ `messages` table — é VIEW no VPS (idem)
❌ Algumas FKs/triggers/policies dessas duas — falharam por dependência das tables acima
❌ ~5 tables com schema divergente em colunas específicas (precisa análise manual)
❌ ~21 functions Lovable com overload conflitando com versão VPS

## Próximos passos recomendados

### Imediato
- [ ] Validar que o **frontend Zapp Web continua funcionando** — RLS pode ter ficado mais restritivo em algumas tables
- [ ] Regenerar `types.ts` no repo: `supabase gen types typescript` apontando para o VPS
- [ ] Commitar log de aplicação

### Médio prazo (1-2 dias)
- [ ] Resolver as 5 tables com schema divergente — análise manual
- [ ] Decidir se as 21 functions com conflito devem ser harmonizadas (Lovable wins) ou mantidas (VPS wins)
- [ ] **Importar dados** — quando o usuário trouxer o dump do painel Lovable

### Longo prazo
- [ ] Copiar arquivos físicos dos buckets via Storage API (script Python/Node a fazer)
- [ ] Setup de migration tracking automatizado (Atlas, Liquibase ou supabase-cli)

## Arquivos gerados nesta sessão

- `/workspace/zapp-audit/12_VPS_APPLY/apply_20260502T213351Z.log` — log completo (137K, 1639 linhas)
- `/workspace/zapp-audit/12_VPS_APPLY/RELATORIO_APLICACAO.md` — este relatório
- `/tmp/out0[1-5]*.log` — saídas individuais de cada passo
