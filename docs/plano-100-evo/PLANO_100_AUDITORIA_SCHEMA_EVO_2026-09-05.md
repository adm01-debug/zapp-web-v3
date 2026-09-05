# PLANO 100 — Auditoria e otimização do schema `evo` (Supabase self-hosted) × Evolution API

**Data da auditoria ao vivo:** 2026-09-05 19:26–19:45 UTC
**Executor previsto:** Claude Code (novo chat), coordenando 5 agentes especializados
**Escopo:** schema `evo` do Supabase self-hosted (PG 15.8, `supabase.atomicabr.com.br`), pipeline
`WhatsApp → Evolution API (PG14 `evolution`) → RabbitMQ → consumer (stack 113) → edge `evolution-webhook` → evo.*`,
crons pg_cron, funções, triggers, índices, FKs, RLS, documentação para agentes de IA.
**Repos:** `adm01-debug/evolution-stack` (dono do `evo`, ADR-015) e `adm01-debug/zapp-web-v3` (edge functions, migrations, hooks).

> Este documento é **auto-suficiente**: foi escrito para ser colado num chat novo e executado etapa por etapa.
> Cada etapa traz agente responsável, ferramenta MCP, ação exata, critério de aceite (checkpoint) e rollback.
> Nada aqui foi executado ainda — é plano. Os números da seção 1 foram medidos ao vivo nesta sessão.

---

## 0. Como executar este plano (leia antes de qualquer etapa)

### 0.1 Regras invioláveis

1. **Identidade do banco antes de qualquer MCP Supabase:** `SELECT current_setting('server_version')` deve ser `15.8` e os schemas `zapp` e `evo` devem existir. Banco errado = abortar (incidente cross-tenant de 2026-08-30).
2. **Migrations no self-hosted:** `supabase_apply_migration` está bugado. DDL via `supabase_db_query` + `INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES (...)` + arquivo espelho em `zapp-web-v3/supabase/migrations/` (ou `evolution-stack/db/migrations/` quando for objeto `evo` de infra).
3. **Nunca registrar webhook direto Evolution→edge** (A13). Eventos sobem só por RabbitMQ.
4. **Evolution API:** `Rabbitmq.events` da instância é definido por `POST /rabbitmq/set/wpp2` (API), **não** pelo env `RABBITMQ_EVENTS_*` (o env não é gate em modo local). Toda mudança de eventos é via `evo_rabbitmq_set`.
5. **Portainer:** IDs de container rotacionam; resolver com `portainer_list_containers` antes de `exec`. Shell é `dash`.
6. **Escrita GitHub:** MCP `GITHUB - MCP - FOREVER`. Branch por lote (`fix/`, `chore/`, `docs/`), PR para `main`, merge humano.
7. **Diff mínimo.** Cada etapa muda uma coisa. Não refatorar o que não está na etapa.
8. **Checkpoint obrigatório:** só marcar `[x]` quando o critério de aceite foi verificado ao vivo (query/log/HTTP). Registrar evidência (1 linha) no checkpoint.
9. **Ações destrutivas ou de custo** (DROP, DELETE em massa, restart da Evolution, mudança de eventos RabbitMQ, mudança de imagem) exigem `APROVADO` do Joaquim na etapa. Elas estão marcadas com ⚠️.
10. **Registro:** ao fim de cada fase, atualizar `docs/CHANGELOG_SESSIONS.md` (zapp) e `ESTADO.md` com o que mudou de fato.

### 0.2 Os 5 agentes

| Agente | Papel | Ferramentas MCP principais | Etapas |
|---|---|---|---|
| **A1 · Infra & Broker** | Evolution API (stack 25), RabbitMQ, consumer (113), PG14 `evolution`, watchdogs, imagem GHCR | `PORTAINER - MCP`, `EVO - MCP`, `GITHUB - MCP - FOREVER`, `portainer_exec_container` no `postgres_postgres` (psql PG14) | 7–15, 23–29, 73–76, 96 |
| **A2 · Ingestão & Edge** | `evolution-webhook`, `_shared/providers/evolution`, ledger, DLQ, reconciliação PG14↔evo | `SUPABASE SELF HOSTED - MCP` (`supabase_db_query`), `GITHUB - MCP - FOREVER`, `supabase_functions_invoke` | 16–22, 30–34, 97 |
| **A3 · DBA schema evo** | Tabelas, colunas, índices, FKs, triggers, partições, RLS, vacuum, storage físico | `SUPABASE SELF HOSTED - MCP` | 35–56, 98 |
| **A4 · Qualidade & Normalização** | LID→PN, contatos, conversas, vocabulários (`status`, `message_type`), mídia, fronteira zapp×evo | `SUPABASE SELF HOSTED - MCP`, `EVO - MCP` | 57–72, 99 |
| **A5 · Automação, Observabilidade & Docs IA** | pg_cron, alertas, views de monitoramento, `COMMENT ON`, `v_ai_catalog`, drift gates, docs/CLAUDE.md | `SUPABASE SELF HOSTED - MCP`, `GITHUB - MCP - FOREVER`, `N8N` | 1–6, 77–95, 100 |

**Coordenação:** o orquestrador (o próprio chat) executa as etapas na ordem; etapas de agentes diferentes dentro da mesma fase podem rodar em paralelo quando não há dependência (marcada com `dep:`). Cada agente escreve suas evidências em `/tmp/plano100/aN-etapaNN.md` e o orquestrador consolida no checkpoint da fase.

### 0.3 Formato de checkpoint

```
- [ ] Etapa NN · <título>
      Aceite: <condição verificável>
      Evidência: <query/log/URL + resultado>   ← preencher ao executar
      Rollback: <como desfazer>
```

---

## 1. O que foi encontrado ao vivo (base factual do plano)

### 1.1 Topologia real (revalidada em 2026-09-05)

```
WhatsApp ──Baileys──▶ Evolution API 2.3.7 custom (stack 25, digest e54abb3c)
                          │ Prisma → PG14 "evolution" (749 MB; Message 296k/521 MB; MessageUpdate 34k)
                          │ RabbitMQ exchange "evolution", filas wpp2.<evento> (24 filas)
                          ▼
              evolution-rabbit-consumer v8.1.4 (stack 113, 2 réplicas, prefetch 5)
                          │ POST HMAC → https://supabase.atomicabr.com.br/functions/v1/evolution-webhook/<evento>
                          ▼
              Supabase PG 15.8 · schema evo (76 tabelas, 33 views, 3 matviews, 104 funções, 67 triggers)
                 evo.evolution_messages (LIST instance_name) → partições: wpp2 (322.670 linhas, 363 MB), default (0)
                 evo.evolution_conversations → wpp2 (16.377), default, logistica, financeiro, compras, marketing (0)
                 evo.evolution_contacts (22.674) · evo.ingest_ledger (87k) · evo.evolution_webhook_events_v2 (RANGE mensal)
                          │ FDW postgres_fdw "evolution_postgres" → evo.fdw_evolution_message / pg14_message_hourly
                          ▼
              zapp.* views auto-updatable (security_invoker) → frontend React (schema 'zapp') · Realtime lê WAL de evo.*
```

- Webhook direto: **desabilitado** (`enabled=false`) — A13 respeitado.
- `evo_status wpp2`: `open`, `isHealthy=true`, Message=295.854, Contact=8.139, Chat=6.402. Último `disconnectionReasonCode=401` em 2026-09-03 18:05Z.
- Eventos RabbitMQ **ativos na instância (API)**: 23 eventos, incluindo `MESSAGES_SET`, `CHATS_SET`, `CONTACTS_SET`, `PRESENCE_UPDATE`, `LABELS_EDIT`, `LABELS_ASSOCIATION`, `CALL`, `QRCODE_UPDATED` — divergente do env do stack (`stacks/evolution.yml:159-176`), que desligou LABELS/CALL/QRCODE sem efeito.

### 1.2 Perda de mensagens — resultado da conferência PG14 × espelho `evo`

| Métrica (medida ao vivo) | Valor | Leitura |
|---|---|---|
| PG14 `Message` últimas 24h | 836 | fonte primária |
| `evo.evolution_messages` últimas 24h (por `wa_timestamp`) | 471 | espelho |
| Inbound (`fromMe=false`) 24h no PG14 | 248 | — |
| Mensagens `@lid` no PG14 24h | 552 (66%) | normalizadas para PN no espelho (só 10 `@lid` residuais em 7d) |
| **Outbound texto para PN (`fromMe=true`, `@s.whatsapp.net`, `conversation`) 48h** | **528 no PG14 · 0 no espelho** | ⚠️ perda ou classificação errada — investigar (etapas 16–18) |
| **Outbound mídia para LID 48h** (image 283, audio 97, sticker 25, doc 23, video 17) | **445 no PG14 · 10 no espelho** | ⚠️ mídias enviadas pelos agentes não chegam ao CRM; no espelho `from_me=true` com mídia em 7d = **0** |
| Reações inbound 48h | 46 no PG14 · 0 em `evolution_messages` | by design (vão para `zapp.evolution_reactions`) |
| Grupos (`@g.us`) 48h | 30 texto + 16 mídia · 0 no espelho | by design (`group_message_inbound` rejeitado na edge) |
| `secretEncryptedMessage` | 25 · 0 | by design (`unsupported_message_type`) |
| `recon_coverage_daily` (só inbound, não-grupo) | 99,71% (4 faltantes, todos LID) | **métrica cega para outbound** |
| Alertas `fdw_ingest_deficit` (critical) abertos | 7 (déficits de 32–107 msgs/h em 03–04/09) | consistentes com os dois itens ⚠️ acima |
| **Janela 2026-08-26 → 2026-09-02** | PG14 = 0 mensagens/dia; espelho = 0 | **8,7 dias sem WhatsApp** (flapping 24–25/08 → `408 ETIMEDOUT` → canary/watchdog em restart-loop → disco 96–98%). Inbound desse período **não existe em nenhum banco** (`DATABASE_SAVE_DATA_HISTORIC=false`, `syncFullHistory=false`) |
| Fila `wpp2.messages.set` / `wpp2.chats.set` | 32 msgs, **0 consumers** | histórico pós-reconexão descartado |
| Fila `wpp2.presence.update` | **3.902 msgs, 0 consumers**, crescendo | evento habilitado sem consumidor |
| `evo.v_dedup_failures` / `v_ack_loss_candidates` / `zapp.evolution_webhook_dlq` / `failed_messages` | 0 / 0 / 0 / 0 | sem duplicata nem DLQ acumulada (mas DLQ do consumer grava em conexão errada — ver 1.6) |
| `ingest_ledger` 30d rejeitados | 109 `unsupported_message_type`, 2 `outgoing_text_empty`, 2 `group_message_inbound`, 2 `event_type_not_in_whitelist` | — |

### 1.3 Latência (inbound, 7 dias, `ingest_ledger.received_at − evolution_messages.wa_timestamp`)

| p50 | p95 | p99 | máx | >60 s | edge (`latency_ms`) avg / p95 |
|---|---|---|---|---|---|
| 1,0 s | 51,3 s | 383 s | 21.158 s (5,9 h) | 119 de 2.444 (4,9%) | 77 ms / 226 ms |

Distribuição inbound: `<2s` 2.071 · `2–10s` 194 · `10–60s` 60 · `1–10min` 113 · `10–60min` 5 · `>1h` 1.
A edge responde em <0,3 s; **a cauda longa está antes da edge** (Baileys/Evolution → RabbitMQ → consumer). O consumer bloqueia a réplica inteira com `time.sleep` no callback (até 300 s) e retenta 5xx (`502/500` já registrados). Não há timestamp de publicação do RabbitMQ persistido — a latência por trecho é **não mensurável hoje**.

### 1.4 Saúde física do schema `evo`

| Item | Medido | Diagnóstico |
|---|---|---|
| `evo.evolution_messages_wpp2` | heap 133 MB · **índices 213 MB** (16 índices) · TOAST 16 MB | índices > heap; 5 índices com 0 scans (`idx_msgs_wpp2_conversation_fk` 4,5 MB, `idx_audio_transcription_queue`, `idx_msgs_wpp2_followup_pending`, `evolution_messages_wpp2_reply_to_id_idx`, `idx_evo_msgs_wpp2_media_pending_v2`) |
| Outros índices 0-scan >64 kB | `idx_ledger_instance_outcome_recv` 5,3 MB, `idx_evo_contacts_assigned` 2,3 MB, `idx_evo_convs_wpp2_inbox`, 4× `media_loss_*`, 2× `e2e_probe_*`, `evo_wcq_pending_idx`, `idx_orphan_triage_classe` | candidatos a DROP após janela de observação |
| `media_download_queue` | UNIQUE `(message_id)` + UNIQUE parcial `(message_id) WHERE status NOT IN (...)` | redundante; 3 FKs (parent + 2 partições) para o mesmo par de colunas |
| FK `conversation_id` | só na partição `wpp2` (`fk_msgs_conversation_id → evolution_conversations_wpp2`) | parent sem FK; partições novas nascem sem integridade |
| `evolution_contacts` UNIQUE | `UNIQUE(remote_jid)` global + `UNIQUE(phone_number, instance_name)` | impede o mesmo contato em 2 instâncias (bloqueia multi-instância) |
| REPLICA IDENTITY | `FULL` em `evolution_messages_wpp2`, `evolution_messages` (parent) e `evolution_contacts` | cada UPDATE grava a linha inteira (55 colunas + jsonb) no WAL; Realtime só precisa de FULL para filtrar DELETE |
| Triggers em `evolution_messages_wpp2` | 15 (6 clonados do parent + **9 locais só na partição**: `trg_normalize_remote_jid`, `trg_ledger_on_insert`, `trg_touch_conv_from_message`, `trg_touch_contact_last_message`, `trg_enforce_direction`, `trg_enqueue_media_wpp2`, `trg_sync_status_to_dedicated`, `trg_auto_save_sticker_wpp2`, `trg_classify_media_status`) | partição `default` (e qualquer instância nova) **não normaliza LID, não gera ledger, não atualiza conversa**; `trg_classify_media_status` + `trg_classify_media_status_parent` disparam **em dobro** na wpp2 |
| Triggers em `evolution_contacts` | 21 (3 snapshot, bitrix, lead score, contact_intelligence, notify_new_lead…) | `fn_touch_contact_last_message` faz UPDATE em `evolution_contacts` **a cada mensagem** → 21 triggers por mensagem (amplificação) |
| Funções de trigger | 34 das 44 funções usadas por triggers de `evo.*` vivem em `zapp` | fronteira invertida; `fn_normalize_remote_jid` lê `public.evo_lid_phone_map` (view proxy) |
| jsonb redundante em `evolution_messages_wpp2` | `payload` 45.629 linhas/293 kB · `raw_data` 1.374/2 MB · `media_meta` (LEGADO) 4.322/3,3 MB · `ingest_meta` 3,4 MB | 7d: 100% sem `raw_data`, 91% sem `ingest_meta`, 99,8% sem `payload` — 4 colunas para o mesmo papel, preenchimento errático |
| Vocabulário `message_type` (30d, `from_me=true`) | `text` 30.991 **e** `conversation` 859; `audio` 761 **e** `audioMessage` 171; `image` 2.281 **e** `imageMessage` 104; `document`/`documentMessage`, `sticker`/`stickerMessage`, `video`/`videoMessage`, `reaction`/`reactionMessage` | dois vocabulários (canônico × Baileys) na mesma coluna |
| `pg_stat_database` | `xact_rollback` 373k de 2,66 M (**16%**) | taxa de rollback alta — triggers fire-and-forget com `EXCEPTION WHEN OTHERS` (subtransações) são suspeito principal |
| Autovacuum | `messages_wpp2` nunca autovacuumado (cron `VACUUM ANALYZE` 2/2h, 5 s cada); dead tuples baixos | ok, mas manual |
| Postgres 15.8 | `shared_buffers` 2 GB · `work_mem` 16 MB · `statement_timeout` 30 s · `max_connections` 150 · `wal_level=logical` · temp_files 151 (2,4 GB) | `statement_timeout` derrubou a própria query de reconciliação FDW desta auditoria |
| Cobertura de `COMMENT ON` | 75/76 tabelas, 100% colunas exceto `lid_phone_map_invalid_archive` (81,8%, sem comment de tabela); views `v_ai_health_summary` e `v_kpi_overview` sem comment; `zapp.realtime_message_fanout` 0/18 colunas | quase completo |

### 1.5 Fronteira `evo` × `zapp` (cada informação no seu lugar?)

- **Domínio WhatsApp fisicamente em `zapp`** (deveria ser `evo` pela ADR-DB-002/ADR-015): `evolution_media` (21.642), `evolution_whatsapp_status` (16.103), `evolution_reactions` (964), `evolution_groups` (221), `evolution_group_participants` (10.860), `evolution_labels`, `evolution_label_associations`, `evolution_calls`, `webhook_events_processed` (99k), `webhook_audit_log` (41k), `evolution_alerts`, `evolution_notifications`, `evolution_retry_metrics`, `evolution_send_idempotency`, `evolution_instance_credentials`, `realtime_message_fanout`.
- **Fora do domínio mas em `evo`**: `vps_*` (5 tabelas), `audit100_baseline`, `_dead_idx_usage_audit_20260820`, `_dead_migration_watermark_20260820`, `_unknown_media_backfill_20260820`, `_recon_*`, `ops_runbooks`, `kpi_rollup_24h`, `e2e_probe_results`, `pipeline_canary_log`, `_snapshot_version_state`, `_secure_config`, `_rabbit_probe`, `lid_phone_map_invalid_archive`.
- **`CLAUDE.md` do zapp está desatualizado**: diz 136 tabelas em `evo` (são 76), 14 partições de `evolution_messages` (são 2), `evolution_media`/`evolution_whatsapp_status` em `evo` (estão em `zapp`).
- **Dados de teste em produção**: `evolution_contacts.instance_name` ∈ {`comercial_03`, `e2e-test`, `vendedor_01`, `wpp_pink_test`} além de `wpp2`.
- Mídia descrita em **4 lugares**: `evolution_messages.media_*` (11 colunas), `zapp.evolution_media`, `evo.media_download_queue` (morta desde 22/08: 0 linhas em 7d, 2.883 `failed`), `evo.media_cache`; `media_storage_config` diz R2 ativo, `media_bucket` das mensagens aponta para Supabase Storage.

### 1.6 Qualidade de dados

| Métrica | Valor |
|---|---|
| Conversas com JID `@lid` | 5.451 de 15.991 (34%) — duplicam a conversa PN do mesmo contato |
| Conversas sem `contact_id` | 3.146 · com `message_count` 0: 956 · inativas >90d: 8.938 · com `unread_count>0`: 3.335 |
| Contatos `@lid` | 6.576 · sem `phone_number`: 8.055 · sem `last_message_at`: 9.864 · soft-deleted: 285 |
| `v_lid_convergence_status.fake_jids` (LID gravado como telefone) | **31.873** históricos |
| `lid_phone_map` | 4.303 (4.297 reais) · `contact_identity` 16.626 |
| Mensagens 7d: `contact_id` NULL 0 · `conversation_id` NULL 3 · `wa_timestamp` NULL 0 · `direction` inconsistente 0 · `status` maiúsculo 0 · `message_type='unknown'` 13 | ingestão recente está limpa |
| `media_status` 30d (imagens) | ready 2.066 · **none 1.642** (sem URL — anteriores a 24/08, pipeline de fila morto) · expired 62 · permanently_lost 4 |
| `ingest_ledger` | 2 linhas por mensagem (trigger `inserted` + edge `processed`); `latency_ms` só na linha `processed` |

### 1.7 Automação (pg_cron) e alertas

- `cron.job`: 242 jobs (239 ativos), **94 tocam o pipeline evo**; 0 falhas em 7d; 6 linhas `status='connecting'` sem `start_time` (zumbis) em jobs 4, 84, 161, 168, 336, 427.
- `job_run_details` só desde 2026-09-02 (retenção curta) — histórico de falhas anterior perdido.
- **Inativos:** `wpp2-session-expiry-watchdog` (job 120, `active=false`) e `expire-old-media-queue` (job 9).
- Jobs caros: `lid-regression-suite-2h` 11 s ×12/dia, `recon-coverage-daily` 14 s, `VACUUM ANALYZE evo.evolution_messages` 5 s ×12/dia, `refresh_mv_daily_kpis` 1,2 s ×24/dia, `fn_reconcile_media_fk_orphans` */15.
- **Alertas abertos (`zapp.evolution_alerts`, 141):** `wal_slot_absent` 68 (slot `cainophile` do Logflare — ruído a cada 15 min), `license_heartbeat` 58 (critical, `HTTP=NULL` desde 26/08 — monitor de licença sem endpoint), `fdw_ingest_deficit` 7, `types_schema_drift` 1 (36 dias), `evo_guardian_weekly/monthly`, `recon_coverage`, `ddl_drop_alert` 2.
- **`zapp.warroom_alerts` 7d:** 1.812 `[DISK FREEZE] 94%`, 422 `401 DETECTION BLIND`, 28 `DISK RECOVERY`. Disco hoje: **165/194 GB (86%)** no host e no PG14.
- Evolution PG14: `_baileys_error_events` 380k linhas/76 MB, `_audit_outbound_trap` 72 MB, índices sem uso em `Message` (`idx_message_key_remotejid_id` 28 MB, `idx_message_key_remotejid_ts` 16 MB, `Message_instanceId_messageTimestamp_idx` 25 MB/282 scans), `max_wal_size` 1 GB.
- **Bug ativo na imagem em produção:** `PrismaClientValidationError: Argument remoteJid is missing` em `messageUpdate.create` (log Evolution 19:25Z). O fix T21 (`remoteJid` fallback) está em `main` (commit `976e8bd`) mas a imagem rodando é `e54abb3c` (drift GitOps A5 do PR #109). Efeito: ACKs `DELIVERY_ACK/READ` não gravados no PG14 quando `p.remoteJid` vem vazio → status de entrega perdido.

### 1.8 Consumer / RabbitMQ (do repo + broker vivo)

- v8.1.4 em código, imagem em produção `f6dd6eb5` = v8.2 pré-fix; **não há workflow de build** do consumer (`publish-evolution-consumer.yml` ausente).
- DLQ de teto 5xx grava `INSERT INTO zapp._consumer_dlq` **na conexão PG14** (`pg_evolution_url_consumer_v1`), onde a tabela real é `public._consumer_dlq` → erro engolido → drop sem registro.
- 4xx (422 `contract_violation`, 429 quando não honrado) = ack+drop sem DLQ.
- `time.sleep` no callback bloqueia a réplica (single-thread) por até 300 s > `heartbeat=60`.
- Stats a cada 30 s em `evo.evolution_rabbit_consumer_stats` (113k linhas, colunas `instance/ok_count/...` nunca preenchidas). `retry_by={"5xx:502":2,"5xx:500":1}` acumulado desde 25/08.
- `config/rabbitmq-definitions.json` stale (bindings errados) — DR por import recriaria topologia errada.
- `unroutable.audit` sem consumidor, TTL 24h.

### 1.9 RLS / grants

- `evo`: RLS em 100% das tabelas; 106 policies; `anon` sem grants (ok).
- `authenticated`: SELECT em 18 tabelas; **INSERT permitido** em `evolution_messages_wpp2`/`evolution_messages` (agente pode inserir mensagem se contato atribuído a ele ou sem dono) e em `evolution_contacts` (admin/supervisor).
- `metabase_reader` (112 tabelas) e `om_reader` (110) leem tudo, inclusive `raw_data`/`content` (PII) — sem mascaramento.
- 81/104 funções `evo` são `SECURITY DEFINER`, todas com `search_path` fixado (ok). `v_security_audit` sem anomalias.

---

## 2. As 100 etapas

Legenda: **A1–A5** agente · ⚠️ exige `APROVADO` · `dep:` dependência · `MCP:` ferramenta.

### FASE 0 — Preparação e baseline (etapas 1–6) · A5

- [ ] **Etapa 1 · Abrir o chat, carregar contexto e travar identidade do banco**
      MCP: `SUPABASE SELF HOSTED - MCP` → `SELECT current_setting('server_version'), (SELECT count(*) FROM pg_namespace WHERE nspname IN ('zapp','evo'))`.
      Aceite: `15.8` e `2`. Se diferente, PARAR.
      Rollback: n/a.

- [ ] **Etapa 2 · Congelar baseline numérica em `evo.audit100_baseline`**
      Inserir 30 métricas desta seção 1 (contagens, tamanhos, p50/p95/p99, filas RabbitMQ, alertas abertos) com `captured_at=now()` e `tag='plano100-evo-2026-09'`. Usar a tabela existente (`audit100_baseline`, 7 colunas) — conferir colunas com `\d` antes.
      Aceite: `SELECT count(*) FROM evo.audit100_baseline WHERE tag='plano100-evo-2026-09'` = 30.
      Rollback: `DELETE ... WHERE tag='plano100-evo-2026-09'`.

- [ ] **Etapa 3 · Criar branch e pastas de trabalho nos dois repos**
      MCP: `GITHUB - MCP - FOREVER` → `github_create_branch` `chore/plano100-evo` em `evolution-stack` e `zapp-web-v3` a partir de `main` atualizada. Criar `/tmp/plano100/` no container `claude-code`.
      Aceite: `github_get_branch` retorna sha em ambos.
      Rollback: `github_delete_branch`.

- [ ] **Etapa 4 · Snapshot DDL do schema `evo` antes de qualquer mudança**
      MCP: `portainer_exec_container` no `supabase_db` → `pg_dump -U postgres -d postgres -n evo --schema-only > /tmp/evo_pre_plano100.sql`; copiar para `evolution-stack/db/schema/snapshots/evo_2026-09-XX_pre_plano100.sql` via `github_put_file`.
      Aceite: arquivo no branch com ≥ 20.000 linhas.
      Rollback: n/a (só leitura).

- [ ] **Etapa 5 · Snapshot do broker e da instância**
      MCP: `EVO - MCP` → `evo_rabbitmq_find`, `evo_settings`, `evo_webhook`, `evo_instance_info` (wpp2); RabbitMQ Management via `evo.fn_collect_backlog_history()` já roda a cada 10 min — copiar a última captura. Salvar em `/tmp/plano100/a5-etapa05.json`.
      Aceite: JSON com `events[]` (23), `webhook.enabled=false`, 24 filas.
      Rollback: n/a.

- [ ] **Etapa 6 · Definir janela de observação e SLO alvo**
      Registrar no topo deste doc (no branch): SLO inbound p95 ≤ 10 s, p99 ≤ 60 s; cobertura PG14→evo inbound ≥ 99,9% e outbound (texto+mídia) ≥ 99%; fila RabbitMQ sem consumidor = 0; alertas abertos ≤ 10.
      Aceite: seção "SLO" commitada.
      Rollback: n/a.

### FASE 1 — Estancar perda (etapas 7–22) · A1 + A2

**Bloco A1 — origem/broker**

- [ ] **Etapa 7 · Confirmar drift de imagem e o bug `remoteJid` no PG14** · A1
      MCP: `portainer_container_logs` da task `evolution_evolution` (tail 500) → contar `Argument \`remoteJid\` is missing`; `github_list_workflow_runs` do `publish-evolution-api-custom.yml` → digest gerado pelo commit `976e8bd`.
      Aceite: contagem registrada; digest do último build ≠ `e54abb3c` (confirma drift).
      Rollback: n/a.

- [ ] **Etapa 8 ⚠️ · Deploy da imagem com T21 (fix `remoteJid`)** · A1 · dep: 7
      Editar `stacks/evolution.yml:31` para o digest do build de `976e8bd` (imutável), PR para `main`, merge → Portainer GitOps redeploya (`update_config: start-first`, seguro desde 03/09). Alinhar `EXPECTED_DIGEST` em `stacks/evolution-watchdogs.yml`.
      Aceite: `evo_status` `open` ≤ 3 min após deploy; 0 ocorrências do erro em 30 min de log; `portainer-drift-check` sem alerta.
      Rollback: reverter o digest no yml (rollback também via GitOps).

- [ ] **Etapa 9 · Pós-deploy obrigatório: reabilitar publisher RabbitMQ** · A1 · dep: 8
      Bug conhecido (runbook `RABBITMQ_PUBLISHER_FIX.md`): após `service update` a Evolution grava no PG14 mas não publica. `EVO - MCP` → `evo_instance_restart wpp2` **somente se** `evo_rabbitmq_find` mostrar `enabled=true` e a fila `wpp2.messages.upsert` ficar sem tráfego por 10 min em horário comercial.
      Aceite: `ingest_ledger` recebe `messages.upsert` em ≤ 5 min após uma mensagem de teste (enviar via `evo_send_text` para o próprio número).
      Rollback: n/a.

- [ ] **Etapa 10 ⚠️ · Alinhar eventos RabbitMQ da instância ao que tem consumidor** · A1
      MCP: `EVO - MCP` → `evo_rabbitmq_set wpp2` com a lista: `MESSAGES_UPSERT, MESSAGES_UPDATE, MESSAGES_EDITED, MESSAGES_DELETE, SEND_MESSAGE, CONTACTS_UPSERT, CONTACTS_UPDATE, CHATS_UPSERT, CHATS_UPDATE, CHATS_DELETE, GROUPS_UPSERT, GROUP_UPDATE, GROUP_PARTICIPANTS_UPDATE, CONNECTION_UPDATE, LOGOUT_INSTANCE, QRCODE_UPDATED, LABELS_EDIT, LABELS_ASSOCIATION, CALL, APPLICATION_STARTUP`. **Remover** `PRESENCE_UPDATE`, `MESSAGES_SET`, `CHATS_SET`, `CONTACTS_SET` (sem consumidor; `presence` gera 3.902 msgs órfãs). Decisão alternativa (se o Joaquim quiser presença no CRM): manter `PRESENCE_UPDATE` **e** ligar o consumidor da fila (etapa 15).
      Aceite: `evo_rabbitmq_find` reflete a lista; `evo.rabbitmq_backlog_history` mostra `wpp2.presence.update` sem crescimento em 1 h.
      Rollback: `evo_rabbitmq_set` com a lista da etapa 5.

- [ ] **Etapa 11 ⚠️ · Purgar filas órfãs** · A1 · dep: 10
      Via RabbitMQ Management API (`fn_collect_backlog_history` já tem credenciais no vault): `DELETE /api/queues/evolution/wpp2.presence.update/contents` e idem `messages.set`, `chats.set`. Antes, exportar 32 mensagens de `messages.set` para `/tmp/plano100/messages_set_dump.json` (podem conter histórico útil).
      Aceite: `ready=0` nas 3 filas.
      Rollback: n/a (dump guardado).

- [ ] **Etapa 12 · Corrigir `config/rabbitmq-definitions.json` e `stacks/evolution.yml` (env dos eventos)** · A1 · dep: 10
      Exportar definitions vivas (`GET /api/definitions`), substituir o arquivo stale, e alinhar `RABBITMQ_EVENTS_*` do yml à etapa 10 (documentando no comentário do yml que o gate real é a API). PR.
      Aceite: `diff` entre definitions vivo e arquivo = vazio; CI verde.
      Rollback: revert do PR.

- [ ] **Etapa 13 · Consumer: corrigir DLQ (conexão/schema) e drop 4xx** · A1
      `consumer/consumer.py`: DLQ deve gravar em `public._consumer_dlq` **no PG14** (conexão já é PG14) — ou mover a DLQ para `zapp._consumer_dlq` no Supabase com conexão própria (decidir: manter no PG14, é o que `dlq-ops` lê). 4xx ≠ 429 → também gravar na DLQ antes do ack. 429 → nunca drop (nack+backoff). Testes em `test_consumer.py` para os 3 caminhos.
      Aceite: `pytest consumer/` verde; PR aberto.
      Rollback: revert.

- [ ] **Etapa 14 · Consumer: tirar `time.sleep` do callback e criar workflow de build** · A1 · dep: 13
      Substituir sleep por `nack` com **fila de retry com TTL** (`wpp2.retry.<n>` com `x-message-ttl` e DLX de volta) ou `connection.call_later`; heartbeat 60 s fica seguro. Criar `.github/workflows/publish-evolution-consumer.yml` (build+push GHCR por digest, igual ao da API). Adicionar telemetria por evento: header `x-published-at` (timestamp do broker, `properties.timestamp`) repassado à edge como `x-rabbit-ts`.
      Aceite: imagem nova publicada; `stacks/evolution-rabbit-consumer.yml` com digest novo; 2 réplicas `healthy`; `ok` crescendo nos stats.
      Rollback: digest anterior `f6dd6eb5`.

- [ ] **Etapa 15 · Decidir e implementar consumidor de `messages.set` (histórico pós-reconexão)** · A1 + A2 · dep: 10
      Opção recomendada: manter `MESSAGES_SET` habilitado e fazer o consumer rotear `wpp2.messages.set` para a edge (`handleMessagesSet` já existe em `msg-handlers.ts:174-222` e grava em `zapp.messages`, não em `evo.evolution_messages` — ajustar para `rpc_insert_message` com `ON CONFLICT DO NOTHING`). Assim a próxima queda recupera o histórico recente.
      Aceite: enviar `evo_instance_restart` em janela morta e verificar que `messages.set` é consumido (fila 0) e mensagens do histórico entram sem duplicar (`v_dedup_failures` = 0).
      Rollback: remover binding.

**Bloco A2 — edge/ingestão**

- [ ] **Etapa 16 · Diagnóstico: por que 528 textos outbound para PN não estão no espelho** · A2
      Query: pegar 20 `key->>'id'` do PG14 (`fromMe=true`, `@s.whatsapp.net`, `conversation`, 48h) e cruzar com `zapp.webhook_audit_log.message_id`, `zapp.webhook_events_processed.payload->>'messageId'`, `evo.ingest_ledger.message_id`, `zapp.messages.external_id`. Classificar: (a) nunca chegou à edge (RabbitMQ/consumer), (b) chegou e foi para `zapp.messages` via `send.message`/claim (`rpc_claim_outbound_message`) com outro `message_id`, (c) rejeitado.
      Aceite: tabela de classificação com 100% dos 20 ids explicados.
      Rollback: n/a.

- [ ] **Etapa 17 · Diagnóstico: mídia outbound (445 em 48h) ausente** · A2
      Mesma técnica da 16 para `imageMessage/audioMessage` `fromMe=true`. Hipóteses a confirmar em `handleOutgoingWhatsAppMessage` (`_shared/.../messages.ts:97-140`): claim de placeholder sem `message_type` de mídia; `rpc_insert_message` com `media_*` nulos rejeitado; ou `send.message` chega antes do `messages.upsert` e o `ON CONFLICT DO NOTHING` descarta a versão com mídia.
      Aceite: causa raiz nomeada com arquivo:linha.
      Rollback: n/a.

- [ ] **Etapa 18 · Fix da ingestão outbound (texto + mídia)** · A2 · dep: 16, 17
      Patch mínimo na edge (`zapp-web-v3/supabase/functions/evolution-webhook` + `_shared`), teste unitário reproduzindo o caso, deploy (`edge-deploy.yml` no merge). Se a causa for `ON CONFLICT DO NOTHING` sem enriquecer, trocar por `DO UPDATE SET media_* = COALESCE(EXCLUDED.media_*, ...)`.
      Aceite: 24 h após deploy, PG14 outbound (texto+mídia, não-grupo) × espelho ≥ 99%; `from_me=true AND message_type IN ('image','audio','document','video','sticker')` em 24h > 0.
      Rollback: revert + redeploy.

- [ ] **Etapa 19 · Reconciliação passa a medir outbound** · A2 · dep: 18
      Alterar `evo.fn_recon_coverage_snapshot()` para calcular também `fromMe=true` (não-grupo, não-reaction/protocol) em colunas novas `msgs_source_out_24h`, `missing_out_24h`, `coverage_out_pct` (ALTER TABLE `recon_coverage_daily`). Ajustar alerta `recon_coverage` para disparar em `coverage_out_pct < 99`. Migration espelho.
      Aceite: `SELECT coverage_out_pct FROM evo.recon_coverage_daily ORDER BY snapshot_date DESC LIMIT 1` ≥ 99.
      Rollback: versão anterior da função (guardada na etapa 4).

- [ ] **Etapa 20 · Backfill dos outbound perdidos (03/09 → data do fix)** · A2 · dep: 18
      Via FDW `evo.fdw_evolution_message`: inserir em `evo.evolution_messages` os `fromMe=true` ausentes (texto + mídia com `media_status='pending'`), em lotes de 500 com `rpc_insert_message`/INSERT direto respeitando triggers. Registrar em `evo.evolution_backfill_audit`.
      Aceite: `missing_out_24h` = 0 para as datas backfilled; `v_dedup_failures` = 0.
      Rollback: `DELETE ... WHERE id IN (SELECT ... FROM evolution_backfill_audit WHERE run_id = X)`.

- [ ] **Etapa 21 · Edge: erro de handler não pode virar HTTP 200 silencioso** · A2
      Em `evolution-webhook/index.ts:613-651`: quando o handler falha, responder **503** com `Retry-After` (consumer retenta) **ou** gravar na `evo.evolution_webhook_dlq` **e** criar drenador (`evolution-retry-metrics` ou cron `reprocess_pending_webhooks` já existe para `webhook_events_v2` — reaproveitar). Corrigir também `index.ts:526-541` para não gravar `outcome='processed'` quando o handler retornou sem persistir (`if (!connection) return`).
      Aceite: teste de contrato injetando falha → 503 + retry do consumer → 1 linha em `evolution_messages`; `ingest_ledger` sem `processed` falso.
      Rollback: revert.

- [ ] **Etapa 22 · Checkpoint da Fase 1 (perda)** · A2 + A1
      Rodar por 48 h e medir: PG14 × evo por (`fromMe`, tipo de JID, tipo de mensagem) = tabela da seção 1.2 zerada exceto by design; filas sem consumidor = 0; `fdw_ingest_deficit` sem novos alertas; `Argument remoteJid` = 0 no log.
      Aceite: todos os itens verdes; atualizar `ESTADO.md` e `CHANGELOG_SESSIONS.md`.
      Rollback: n/a.

### FASE 2 — Latência (etapas 23–34) · A1 + A2

- [ ] **Etapa 23 · Instrumentar timestamps por trecho** · A2 · dep: 14
      `evo.ingest_ledger`: adicionar `wa_ts timestamptz`, `rabbit_published_at timestamptz` (header `x-rabbit-ts`), `edge_received_at timestamptz`, `db_committed_at timestamptz default now()`; a edge preenche via `rpc_boundary_ledger_insert` (adicionar 3 parâmetros). Comentar as 4 colunas.
      Aceite: 1 h após deploy, 100% das linhas `processed` com os 4 timestamps.
      Rollback: colunas ficam NULL (sem DROP).

- [ ] **Etapa 24 · View `evo.v_latency_breakdown_24h`** · A5 · dep: 23
      p50/p95/p99 de `rabbit_published_at − wa_ts` (Baileys→broker), `edge_received_at − rabbit_published_at` (fila+consumer), `db_committed_at − edge_received_at` (edge). COMMENT explicando cada trecho.
      Aceite: view responde em < 1 s (índice `idx_ingest_ledger_recv` cobre).
      Rollback: DROP VIEW.

- [ ] **Etapa 25 · Identificar o trecho dominante da cauda (p95 51 s / p99 383 s)** · A1 · dep: 24
      Após 24 h de dados, tabela por trecho. Se `Baileys→broker` dominar: investigar `evo.evolution_connection_history` (reconexões, `pattern_class=flapping` em 7d: 285 reconexões rápidas) e `_baileys_error_events` do PG14 (380k linhas: `stream_error`, `decrypt_fail`, `prekey_upload_fail`). Se `fila+consumer` dominar: etapa 14 já removeu o sleep; checar prefetch e réplicas.
      Aceite: relatório 1 página com o trecho e a causa.
      Rollback: n/a.

- [ ] **Etapa 26 · Consumer: prefetch e réplicas** · A1 · dep: 25
      Se fila dominar: `prefetch 5→20` por réplica e `replicas 2→3` (`stacks/evolution-rabbit-consumer.yml`). Manter `MAX_DELIVERY` alinhado ao `delivery-limit 5` do broker (documentar).
      Aceite: `edge_received_at − rabbit_published_at` p95 < 2 s.
      Rollback: valores antigos.

- [ ] **Etapa 27 · Evolution: reduzir trabalho síncrono por evento** · A1 · dep: 25
      Revisar em `stacks/evolution.yml`: `DATABASE_SAVE_DATA_MESSAGE_UPDATE=true` (cresce `MessageUpdate` e gera o erro T21) — manter só se o CRM usar ACKs do PG14 (não usa: ACK vem por evento). `CACHE_REDIS_TTL` 30 d. Recursos: `limits 2 cpu/3 GB`. Avaliar `LOG_LEVEL=ERROR` apenas.
      Aceite: decisão documentada no yml; sem regressão de `evo_status`.
      Rollback: revert yml.

- [ ] **Etapa 28 · Edge: mover download de mídia para depois do INSERT** · A2
      Hoje o INSERT em `evolution_messages` só acontece após download CDN (30 s) + fallback API (até 4,5 min) + upload + classify + transcrição (risco de o isolate morrer antes do INSERT — comentário em `messages.ts:145-149` registra perda de 22–40% no passado). Inverter: INSERT com `media_status='pending'` → `EdgeRuntime.waitUntil(download+upload+UPDATE)` → fallback `media_download_queue` (etapa 66 reativa a fila).
      Aceite: `db_committed_at − edge_received_at` p95 < 500 ms para mídia; `media_status='ready'` em ≤ 2 min p95.
      Rollback: revert.

- [ ] **Etapa 29 · Edge: timeouts por operação** · A2 · dep: 28
      Timeout global 25 s no handler (abaixo do wall-clock do edge-runtime); retries do gateway Evolution só para 5xx/rede (hoje retenta 4xx também, `client.ts:49-96`).
      Aceite: testes; nenhum request > 25 s em `webhook_audit_log.duration_ms` em 24 h.
      Rollback: revert.

- [ ] **Etapa 30 · Triggers do hot path: consolidar `trg_classify_media_status` duplicado** · A3
      Na partição `wpp2` existe `trg_classify_media_status` (local) **e** `trg_classify_media_status_parent` (clone do parent) → função roda 2× por INSERT. `DROP TRIGGER trg_classify_media_status ON evo.evolution_messages_wpp2`.
      Aceite: `SELECT count(*) FROM pg_trigger WHERE tgrelid='evo.evolution_messages_wpp2'::regclass AND tgname LIKE 'trg_classify%'` = 1; INSERT de teste classifica igual.
      Rollback: recriar trigger (DDL na etapa 4).

- [ ] **Etapa 31 · Triggers do hot path: quebrar a amplificação em `evolution_contacts`** · A3 + A4
      `fn_touch_contact_last_message` faz `UPDATE zapp.evolution_contacts` a cada mensagem → 21 triggers (3 snapshots, bitrix, intelligence, lead score...). Ação: (a) `trg_auto_lead_score`, `trg_contact_bitrix_sync`, `trg_sync_contact_intelligence` e os 3 `trg_snapshot_contacts_*` ganham `WHEN` que ignora UPDATEs que só tocam `last_message_at/total_messages/message_count/updated_at` (usar `OLD.* IS DISTINCT FROM NEW.*` nas colunas de negócio) — ou (b) `fn_touch_contact_last_message` passa a `SET LOCAL app.batch_mode='on'` antes do UPDATE (as 5 triggers já respeitam esse GUC). Opção (b) é 1 linha; adotar.
      Aceite: `EXPLAIN ANALYZE` de 1 INSERT em `evolution_messages_wpp2` mostra `Trigger ... time` total < 5 ms; `xact_rollback` deixa de crescer 16%.
      Rollback: versão anterior da função.

- [ ] **Etapa 32 · Rollback rate (16%): localizar a origem** · A3
      `SELECT * FROM pg_stat_statements WHERE calls > 1000 ORDER BY (rows=0)` não mostra rollback; usar `log_min_duration_statement` + `log_statement='none'` e `SELECT query, calls FROM extensions.pg_stat_statements WHERE query ILIKE '%ROLLBACK%'`; conferir funções com `EXCEPTION WHEN OTHERS THEN NULL` no hot path (`fn_touch_conversation_from_message`, `fn_ledger_from_insert`, `fn_touch_contact_last_message`) — cada bloco EXCEPTION abre subtransação; se a exceção acontece sempre (ex.: `evo.rpc_boundary_ledger_insert` falhando), é rollback constante.
      Aceite: causa identificada e `xact_rollback/xact_commit` < 2% após correção.
      Rollback: n/a.

- [ ] **Etapa 33 · REPLICA IDENTITY DEFAULT em `evolution_messages_wpp2`, `evolution_messages`, `evolution_contacts`** · A3
      Realtime só precisa de FULL para filtrar DELETE por coluna não-PK; os hooks assinam INSERT/UPDATE. Precedente: `realtime_message_fanout` já foi para DEFAULT em 2026-08-20 por saturação. Validar com `grep "event: 'DELETE'"` em `src/` (nenhum em `evolution_*`).
      Aceite: `relreplident='d'`; hooks `useZappMessages`/`useTranscriptionNotifications` continuam recebendo UPDATE (teste manual); WAL gerado por UPDATE cai (medir `pg_wal_lsn_diff` em 1 h de expediente antes/depois).
      Rollback: `ALTER TABLE ... REPLICA IDENTITY FULL`.

- [ ] **Etapa 34 · Checkpoint da Fase 2 (latência)** · A1 + A2
      Aceite: `v_latency_breakdown_24h` com p95 total ≤ 10 s e p99 ≤ 60 s em dia útil; trigger time por INSERT < 5 ms; rollback < 2%.
      Rollback: n/a.

### FASE 3 — Schema físico: partições, índices, FKs, triggers, RLS (etapas 35–56) · A3

- [ ] **Etapa 35 · Levar os 9 triggers locais da partição `wpp2` para o parent `evo.evolution_messages`**
      Para cada um (`trg_normalize_remote_jid`, `trg_ledger_on_insert`, `trg_touch_conv_from_message`, `trg_touch_contact_last_message`, `trg_enforce_direction`, `trg_enqueue_media_wpp2`→`trg_enqueue_media`, `trg_sync_status_to_dedicated`, `trg_auto_save_sticker_wpp2`→`trg_auto_save_sticker`, e o de `default` `trg_enqueue_media_default`): `CREATE TRIGGER ... ON evo.evolution_messages` (clona para todas as partições) e `DROP` o local. `fn_touch_conversation_from_message` hoje faz UPDATE fixo em `evolution_conversations_wpp2` → trocar por `evo.evolution_conversations` (roteamento por `instance_name`).
      Aceite: `SELECT tgname, count(*) FROM pg_trigger WHERE tgrelid IN (partições) GROUP BY 1` mostra cada trigger em todas as partições com `tgparentid<>0`; INSERT de teste na partição `default` (instance `plano100-test`) normaliza JID, gera ledger e toca conversa. Apagar o teste.
      Rollback: DDL da etapa 4.

- [ ] **Etapa 36 · Idem para `evolution_conversations`: `trg_normalize_conversation_jid` só existe na `wpp2`**
      Recriar no parent; DROP local.
      Aceite: trigger em 6 partições.
      Rollback: idem.

- [ ] **Etapa 37 · FK `conversation_id` no parent**
      `evo.evolution_conversations` tem PK `(id, instance_name)`? Verificar (`npk=1`). Se sim: `ALTER TABLE evo.evolution_messages ADD CONSTRAINT fk_msgs_conversation FOREIGN KEY (conversation_id, instance_name) REFERENCES evo.evolution_conversations(id, instance_name) ON DELETE SET NULL NOT VALID; VALIDATE CONSTRAINT` (fora do horário comercial). Depois `DROP CONSTRAINT fk_msgs_conversation_id` na partição.
      Aceite: `pg_constraint` mostra FK no parent e `convalidated=true`; 0 órfãos (`SELECT count(*) ... WHERE conversation_id IS NOT NULL AND NOT EXISTS`).
      Rollback: DROP da FK nova, recriar a da partição.

- [ ] **Etapa 38 · `media_download_queue`: remover UNIQUE/FKs redundantes**
      `DROP INDEX evo.idx_media_queue_message_id_unique` (parcial redundante com `media_download_queue_message_id_key`); `DROP CONSTRAINT media_download_queue_message_uuid_instance_name_fkey` e `_fkey1` (FKs para partições), manter `fk_media_queue_message_uuid` (parent). Verificar antes que `rpc_boundary_enqueue_media_download` usa `ON CONFLICT (message_id)`.
      Aceite: 1 UNIQUE + 1 FK; `fn_reconcile_media_fk_orphans()` roda sem erro.
      Rollback: DDL etapa 4.

- [ ] **Etapa 39 · Índices 0-scan em `evolution_messages_wpp2`: janela de observação**
      Zerar contadores (`SELECT pg_stat_reset_single_table_counters('evo.evolution_messages_wpp2'::regclass)`) e observar 14 dias os 5 índices listados em 1.4. Registrar `idx_scan` no dia 14 em `/tmp/plano100/a3-etapa39.md`.
      Aceite: tabela com `idx_scan` por índice.
      Rollback: n/a.

- [ ] **Etapa 40 ⚠️ · DROP dos índices confirmados sem uso** · dep: 39
      Para cada índice com `idx_scan=0` após 14 dias e sem função/cron que o cite (grep `idx_...` em migrations e funções via `pg_get_functiondef`): `DROP INDEX CONCURRENTLY`. Candidatos: `idx_msgs_wpp2_conversation_fk` (4,5 MB; substituído pela FK do parent + `evolution_messages_wpp2_remote_jid_created_at_idx`), `idx_audio_transcription_queue` (feature não ativada), `idx_msgs_wpp2_followup_pending`, `evolution_messages_wpp2_reply_to_id_idx`, `idx_evo_msgs_wpp2_media_pending_v2`, `idx_ledger_instance_outcome_recv`, `idx_evo_contacts_assigned`, `idx_evo_convs_wpp2_inbox`, `idx_mlr_*` (3), `media_loss_archive_*` (4), `idx_e2e_probe_*` (2), `evo_wcq_pending_idx`, `idx_orphan_triage_classe`. Manter em migration com `CREATE INDEX IF NOT EXISTS` comentado como rollback.
      Aceite: `pg_indexes_size('evo.evolution_messages_wpp2')` < 190 MB; nenhum plano em `pg_stat_statements` regrediu (comparar `mean_exec_time` das 15 queries top).
      Rollback: recriar via `CREATE INDEX CONCURRENTLY` (definições na etapa 4).

- [ ] **Etapa 41 · Índice coberto para o inbox**
      Validar a query real do inbox (hook `useZappConversations`: filtro `instance_name`, `status='aberta'`, order `last_message_at DESC`) com `EXPLAIN`; se usa `evolution_conversations_wpp2_remote_jid_idx` + sort, criar `idx_evo_convs_open_last_msg ON evo.evolution_conversations (instance_name, last_message_at DESC) WHERE status='aberta' AND contact_id IS NOT NULL` (no parent).
      Aceite: `EXPLAIN (ANALYZE, BUFFERS)` mostra Index Scan e < 5 ms.
      Rollback: DROP INDEX.

- [ ] **Etapa 42 · Índice para busca de mensagens por conversa**
      Query do chat (`useZappMessages`: `conversation_id`/`remote_jid` + `created_at DESC` + `deleted_at IS NULL`, limit 50). Já existe `evolution_messages_wpp2_remote_jid_created_at_idx` (31 MB, 1.114 scans) e `..._contact_id_created_at_idx1`. Confirmar que o hook filtra por `remote_jid` **ou** `contact_id` e dropar o par não usado na etapa 40.
      Aceite: EXPLAIN < 3 ms; 1 índice por padrão de acesso.
      Rollback: n/a.

- [ ] **Etapa 43 · `evolution_contacts`: UNIQUE global `(remote_jid)` → `(remote_jid, instance_name)`**
      Pré-requisito: etapa 60 (limpar instâncias de teste). `ALTER TABLE ... DROP CONSTRAINT evolution_contacts_remote_jid_unique; ADD CONSTRAINT uq_contacts_jid_instance UNIQUE (remote_jid, instance_name)`. Ajustar `fn_process_contacts_batch` (`ON CONFLICT (remote_jid)` → `(remote_jid, instance_name)`) e `zapp.contacts` upserts.
      Aceite: `pg_constraint` novo; ingestão de `contacts.upsert` sem erro em 24 h (`webhook_audit_log` status error = 0 para `contacts.*`).
      Rollback: constraint antiga.

- [ ] **Etapa 44 · Partições: alinhar realidade × doc × código**
      `evolution_messages` tem só `wpp2` + `default`; `evolution_conversations` tem 4 partições vazias (`logistica`, `financeiro`, `compras`, `marketing`). Decidir: dropar as 4 vazias (sem instância correspondente) **ou** manter e criar as irmãs em `evolution_messages`. Recomendação: dropar (instâncias não existem) e deixar `rpc_boundary_provision_instance_partitions(p_instance)` como único caminho de criação (já existe; testar).
      Aceite: `pg_inherits` coerente entre messages e conversations; `rpc_boundary_provision_instance_partitions('plano100-test')` cria e `DROP` limpa.
      Rollback: DDL etapa 4.

- [ ] **Etapa 45 · Partição `default`: alerta se receber linha**
      Cron `evo-default-partition-guard` só cobre `evolution_webhook_events_v2_default`. Estender para `evolution_messages_default` e `evolution_conversations_default` (qualquer linha = instância sem partição provisionada → `warroom_alerts`).
      Aceite: INSERT de teste na default dispara alerta em ≤ 30 min; apagar teste.
      Rollback: `cron.alter_job` comando anterior.

- [ ] **Etapa 46 · `evolution_webhook_events_v2`: retenção e partições futuras**
      Cron `retention_webhook_partitions` (mensal, 3 meses) e `auto-create-monthly-partitions` (dia 1) nunca rodaram no histórico disponível. Executar `SELECT evo.fn_retention_webhook_partitions(TRUE, 3)` (dry-run) e `fn_auto_create_next_partitions()` manualmente; conferir que 2027_01..2027_06 já existem (sim) e que `2026_07` (vazia) é dropada.
      Aceite: dry-run lista `2026_07`; execução real dropa; partições até mês+2 existem.
      Rollback: n/a (partição vazia).

- [ ] **Etapa 47 · Colunas jsonb redundantes em `evolution_messages`: consolidar**
      Regra: `ingest_meta` = metadados técnicos (mediaKey, directPath, stanzaId); `raw_data` = payload bruto (LGPD, opcional, TTL 30 d); **`payload` e `media_meta` = legado**. Migração: `UPDATE ... SET ingest_meta = COALESCE(ingest_meta, media_meta)` para as 4.322 linhas com `media_meta`; garantir que nenhuma função/view lê `payload`/`media_meta` (`grep` em `pg_get_functiondef` de todas as funções `evo`/`zapp` + views + edge). Depois `ALTER TABLE ... DROP COLUMN media_meta, DROP COLUMN payload` ⚠️.
      Aceite: 0 referências; colunas removidas; `pg_total_relation_size` cai.
      Rollback: colunas recriadas a partir do dump lógico da etapa 4 + `COPY` do backup diário (pgbackrest 264).

- [ ] **Etapa 48 · Retenção de `raw_data` (LGPD)**
      Cron diário `UPDATE evo.evolution_messages SET raw_data=NULL WHERE raw_data IS NOT NULL AND created_at < now()-interval '30 days'` em lotes de 5.000. COMMENT na coluna com a política.
      Aceite: `count(*) FILTER (WHERE raw_data IS NOT NULL AND created_at < now()-'30 days')` = 0.
      Rollback: n/a.

- [ ] **Etapa 49 · Autovacuum: tirar o VACUUM manual de 2/2h**
      `messages_wpp2` já tem `autovacuum_vacuum_scale_factor=0.05, insert_scale_factor=0.01` mas `last_autovacuum=NULL` porque o cron `vacuum-messages-2h` chega antes. Desativar os crons `vacuum-messages-2h` e `vacuum-contacts-2h` (manter `ANALYZE` diário) e observar 7 dias `n_dead_tup` e `last_autovacuum`.
      Aceite: autovacuum passa a rodar sozinho; `n_dead_tup` < 5%.
      Rollback: reativar crons.

- [ ] **Etapa 50 · `statement_timeout` para roles de serviço**
      Global 30 s derruba reconciliações FDW. `ALTER ROLE evo_reconciler SET statement_timeout='120s'`; idem `postgres` só dentro das funções de reconciliação (`SET LOCAL statement_timeout='120s'` em `fn_recon_coverage_snapshot`).
      Aceite: `fn_recon_coverage_snapshot()` roda em ≤ 60 s sem `query_canceled` por 7 dias.
      Rollback: `ALTER ROLE ... RESET`.

- [ ] **Etapa 51 · RLS: revisar INSERT de `authenticated` em `evolution_messages`**
      Políticas `authenticated_insert_messages` (partição) e `messages_insert_scoped` (parent) permitem agente inserir mensagem direta. O fluxo de envio passa por edge (`evolution-api`) com service_role. Se o front não faz INSERT direto (grep `from('evolution_messages').insert` em `src/` = 0), remover as duas policies.
      Aceite: grep = 0; policies removidas; envio pelo CRM continua funcionando (teste manual).
      Rollback: recriar policies (etapa 4).

- [ ] **Etapa 52 · RLS/grants: BI (`metabase_reader`, `om_reader`) sem PII bruta**
      Revogar SELECT direto nas tabelas `evo.evolution_messages*`, `evolution_contacts`, `ingest_ledger` e conceder em views mascaradas (`evo.v_bi_messages` sem `content/raw_data/ingest_meta`, `evo.v_bi_contacts` com `phone_number` mascarado). Ajustar as 2 fontes no Metabase/OpenMetadata.
      Aceite: `information_schema.role_table_grants` sem grant direto; dashboards do Metabase abrem.
      Rollback: `GRANT SELECT` de volta.

- [ ] **Etapa 53 · Funções de trigger do `evo` que vivem em `zapp`: mover as 9 do hot path para `evo`**
      `fn_normalize_remote_jid`, `fn_ledger_from_insert`, `fn_touch_contact_last_message`, `fn_enforce_direction`, `fn_rt_fanout_insert`, `fn_classify_media_status` (já em evo), `fn_auto_enqueue_media_download`, `fn_filter_canary_messages`, `fn_block_internal_media_url`, `fn_normalize_conversation_jid`: `ALTER FUNCTION zapp.x SET SCHEMA evo` (mantém OID; triggers seguem). Trocar `public.evo_lid_phone_map`/`evo_contact_identity` por `evo.lid_phone_map`/`evo.contact_identity` dentro de `fn_normalize_remote_jid`.
      Aceite: `pg_trigger` aponta para `evo.*`; suíte `evo.fn_lid_normalizer_test_suite()` = 16/16.
      Rollback: `SET SCHEMA zapp`.

- [ ] **Etapa 54 · Sequências e defaults**
      Conferir `id` uuid `gen_random_uuid()` em todas as tabelas evo (ok em messages/contacts); `ingest_ledger.id` bigint sequence — checar `last_value` vs `max` e ciclo. `SELECT * FROM pg_sequences WHERE schemaname='evo'`.
      Aceite: nenhuma sequência > 50% do tipo.
      Rollback: n/a.

- [ ] **Etapa 55 · Bloat e TOAST**
      `pgstattuple` (extensão presente?) em `evolution_messages_wpp2`, `evolution_contacts`, `ingest_ledger`, `evolution_rabbit_consumer_stats` (113k linhas de stats de 30 s — reduzir para 5 min na etapa 76). Se `dead_tuple_percent` > 20% → `VACUUM (FULL)` fora do horário ⚠️ ou `pg_repack`.
      Aceite: bloat < 20% nas 4 tabelas.
      Rollback: n/a.

- [ ] **Etapa 56 · Checkpoint da Fase 3**
      Re-rodar as queries de 1.4 e comparar com baseline (etapa 2). Gerar `evo_post_fase3.sql` (pg_dump schema-only) e commitar.
      Aceite: tabela antes/depois no doc; drift gate `evo-schema-drift-gate.yml` **verde** (atualizar `db/schema/schema-evo.sql`).
      Rollback: n/a.

### FASE 4 — Normalização e qualidade de dados (etapas 57–72) · A4

- [ ] **Etapa 57 · Vocabulário canônico de `message_type`**
      Tabela `evo.message_type_map(baileys_type text PK, canonical text)` com 20 linhas (`conversation→text`, `extendedTextMessage→text`, `imageMessage→image`, `audioMessage→audio`, `ptvMessage→video`, `reactionMessage→reaction`, ...). `CHECK` em `evolution_messages.message_type` só após backfill. COMMENT.
      Aceite: tabela criada e comentada.
      Rollback: DROP TABLE.

- [ ] **Etapa 58 · Backfill `message_type` (859 `conversation`, 171 `audioMessage`, 104 `imageMessage`, …)** · dep: 57
      `UPDATE evo.evolution_messages m SET message_type = mm.canonical FROM evo.message_type_map mm WHERE m.message_type = mm.baileys_type` em lotes de 5.000 com `SET LOCAL app.batch_mode='on'`. Trigger BEFORE INSERT `trg_canonical_message_type` no parent aplicando o map.
      Aceite: `SELECT message_type, count(*) FROM evo.evolution_messages GROUP BY 1` só com valores canônicos; edge continua inserindo canônico.
      Rollback: `evolution_backfill_audit` guarda (id, old, new).

- [ ] **Etapa 59 · Vocabulário de `status`**
      Confirmar (7d = 0 maiúsculos) e adicionar `CHECK (status = lower(status))` + `CHECK status IN ('pending','queued','sending','sent','delivered','read','played','failed','received','deleted')`. Backfill histórico maiúsculo (`UPDATE ... SET status=lower(status)` onde diferente).
      Aceite: CHECK válido (`VALIDATE CONSTRAINT`).
      Rollback: DROP CONSTRAINT.

- [ ] **Etapa 60 ⚠️ · Remover dados de instâncias de teste**
      `evolution_contacts` com `instance_name IN ('e2e-test','wpp_pink_test','vendedor_01','comercial_03')` (contar antes; mover para `archive.evolution_contacts_test_2026_09` em vez de DELETE). Idem em `evolution_conversations`/`messages` (esperado 0 — partições não existem).
      Aceite: `SELECT DISTINCT instance_name FROM evo.evolution_contacts` = {`wpp2`}.
      Rollback: `INSERT ... SELECT` do archive.

- [ ] **Etapa 61 · Conversas `@lid` duplicadas (5.451): merge para a conversa PN**
      Para cada conversa `@lid` com mapa `high/medium` em `lid_phone_map` → conversa PN `phone||'@s.whatsapp.net'`: (1) `UPDATE evolution_messages SET conversation_id = pn.id, remote_jid = pn.remote_jid WHERE conversation_id = lid.id`; (2) somar `message_count/unread_count`, `min(first_message_at)`, `max(last_message_at)`; (3) `UPDATE lid SET status='arquivada', metadata = jsonb_build_object('merged_into', pn.id)`. Função `evo.fn_merge_lid_conversation(p_lid_id uuid, p_dry_run bool)`; rodar dry-run, revisar 20 amostras, executar em lotes de 200.
      Aceite: conversas `@lid` ativas com mapa confiável = 0; `v_ghost_conversations` cai; nenhuma mensagem órfã.
      Rollback: `metadata.merged_into` + `evolution_backfill_audit` permitem reverter.

- [ ] **Etapa 62 · Contatos `@lid` (6.576) e sem telefone (8.055)**
      Rodar `evo.fn_apply_lid_mappings(p_dry_run=>true)` e `fn_auto_apply_lid_mappings()`; para os sem mapa, `evo.fn_sync_lid_from_api('wpp2')` (`evo_contacts` via API traz `remoteJid`/`lid`). Depois merge `evo.evolution_contacts` LID→PN (existe `merge_source_id`/`dedup_hash` para isso) com `contact_id_graveyard`.
      Aceite: `v_lid_health_scorecard.contacts_with_phonejid` > 0 e `lid_contacts` < 1.000; `fake_jids_real_users` (31.873) só históricos com `remote_jid_original` preservado.
      Rollback: graveyard + `merge_source_id`.

- [ ] **Etapa 63 · `remote_jid_original` obrigatório em linhas novas + índice de auditoria**
      `NOT NULL DEFAULT` não é possível (histórico); adicionar `CHECK (created_at < '2026-09-10' OR remote_jid_original IS NOT NULL)` para garantir que o normalizador sempre preenche.
      Aceite: CHECK válido.
      Rollback: DROP CONSTRAINT.

- [ ] **Etapa 64 · Contadores desnormalizados de conversa/contato: reconciliar**
      `evolution_conversations.message_count/unread_count/last_message_at` e `evolution_contacts.total_messages/message_count/last_message_at` divergem por época de trigger. Função `evo.fn_reconcile_counters(p_batch int)` recalcula a partir de `evolution_messages` (agrupado por `conversation_id`/`contact_id`) e cron diário 03:50. Remover a coluna `evolution_contacts.message_count` (duplicata de `total_messages`) ⚠️ após grep no front.
      Aceite: 0 divergências em `SELECT count(*) FROM conversas WHERE message_count <> (SELECT count(*) ...)` amostra 1.000.
      Rollback: n/a.

- [ ] **Etapa 65 · `unread_count`: decremento ao abrir conversa**
      3.335 conversas com `unread_count>0`; validar que `rpc_mark_messages_read` também zera `evolution_conversations.unread_count` (hoje só `is_read` nas mensagens). Ajustar RPC.
      Aceite: abrir conversa no CRM → `unread_count=0` em ≤ 2 s.
      Rollback: revert.

- [ ] **Etapa 66 · Mídia: reativar `media_download_queue` como fallback** · dep: 28
      Fila morta desde 22/08 (2.883 `failed`, 0 novos). Marcar `failed` antigos como `expired` (CDN de 7 dias já venceu), reativar o worker (`evolution-retry-metrics`? ou `evolution-sync` `action=media`) via cron `*/2` chamando `rpc_claim_media_download_batch(20,'wpp2')`. 
      Aceite: INSERT de mensagem de mídia com `media_url` NULL → `done` em ≤ 5 min.
      Rollback: cron off.

- [ ] **Etapa 67 · Mídia: um único lugar de verdade**
      Decidir: `evo.evolution_messages.media_*` é a verdade; `zapp.evolution_media` vira **view** sobre ela (hoje tabela de 21.642 linhas sincronizada por cron diário `sync-evolution-media-daily`); `media_cache` (0 linhas) dropar; `media_storage_config.provider` alinhar ao real (Supabase Storage `whatsapp-media`, não R2) ou migrar de fato para R2 (decisão de custo — perguntar).
      Aceite: `zapp.evolution_media` é view; cron `sync-evolution-media-daily` e `purge-media-orphans-uuid` removidos; front (`useMediaUrl.ts`) funciona.
      Rollback: recriar tabela a partir do backup.

- [ ] **Etapa 68 · 1.642 imagens `media_status='none'` (30d) sem URL**
      Classificar: anteriores a 24/08 com `ingest_meta.mediaKey` presente → enfileirar (`fn_enqueue_orphan_media`) — CDN provavelmente expirado → marcar `permanently_lost` com `media_loss_registry`. As com `mediaKey` ausente → `permanently_lost`.
      Aceite: `media_status='none'` só em mensagens de texto (`message_type='text'`).
      Rollback: n/a.

- [ ] **Etapa 69 · Fronteira: mover tabelas de domínio WhatsApp de `zapp` para `evo`** ⚠️
      Lote 1 (sem FK externa): `evolution_whatsapp_status`, `evolution_reactions`, `evolution_groups`, `evolution_group_participants`, `evolution_labels`, `evolution_label_associations`, `evolution_calls`. `ALTER TABLE zapp.x SET SCHEMA evo` + `CREATE VIEW zapp.x AS SELECT * FROM evo.x WITH (security_invoker=on)` + GRANTs iguais + policies recriadas em evo. O cron `ensure-evolution-backcompat-views` já cria views de compat — usar o mesmo padrão. Realtime: tabelas na publication seguem o OID (`evolution_alerts`, `evolution_realtime_events` ficam em zapp).
      Aceite: front sem erro `PGRST205`; `pg_publication_tables` inalterado; edge grava.
      Rollback: `SET SCHEMA zapp` + DROP VIEW.

- [ ] **Etapa 70 · Fronteira: tirar de `evo` o que não é WhatsApp** ⚠️
      `vps_*` (5), `audit100_baseline`, `ops_runbooks`, `kpi_rollup_24h` → schema `ops`; `_dead_*`, `_unknown_media_backfill_20260820`, `_recon_*`, `_rabbit_probe`, `_snapshot_version_state` → `archive` ou DROP (conferir `fn_purge_recon_temp_tables`, `v_50_steps_progress`, `fn_vps_*`, `fn_kpi_rollup_refresh`, `v_kpi_overview` e ajustar `search_path`).
      Aceite: `evo` com ≤ 60 tabelas, todas do domínio; `v_ai_catalog` reflete.
      Rollback: `SET SCHEMA evo`.

- [ ] **Etapa 71 · `webhook_events_processed` / `webhook_audit_log` / `ingest_ledger`: uma trilha só**
      Três trilhas por evento (99k + 41k + 87k linhas). Decidir: `ingest_ledger` (evo) = trilha canônica com os 4 timestamps (etapa 23); `webhook_audit_log` mantém só erros/rejeições (`status <> 'processed'`); `webhook_events_processed` mantém só dedup (colunas `event_id`, `processed_at`; dropar `payload`). Remover a linha `inserted` duplicada do ledger (trigger `fn_ledger_from_insert`) já que a edge grava `processed` — ou o contrário; escolher a da edge (tem latência).
      Aceite: 1 linha por mensagem no ledger; `webhook_audit_log` cresce < 1k/dia.
      Rollback: reativar trigger.

- [ ] **Etapa 72 · Checkpoint da Fase 4**
      Re-rodar as queries de 1.5 e 1.6. `v_ai_health_summary.agent_health_status='HEALTHY'`, `v_lid_health_scorecard` melhor que baseline, `message_type` canônico 100%.
      Aceite: tabela antes/depois.
      Rollback: n/a.

### FASE 5 — pg_cron, watchdogs, PG14, alertas (etapas 73–84) · A1 + A5

- [ ] **Etapa 73 · PG14: `MessageUpdate` e purge**
      Decisão da etapa 27 sobre `DATABASE_SAVE_DATA_MESSAGE_UPDATE`. Se ficar `true`: purge v14 já cobre 30 d; se `false`: `TRUNCATE "MessageUpdate"` ⚠️. Alinhar `IsOnWhatsapp` (Evolution `DAYS=7` vs purge 30 d).
      Aceite: `stacks/evolution-db-purge.yml` e `evolution.yml` coerentes; `_purge_runs` ok em 24 h.
      Rollback: n/a.

- [ ] **Etapa 74 ⚠️ · PG14: índices sem uso e tabelas de log gigantes**
      `DROP INDEX CONCURRENTLY idx_message_key_remotejid_id` (28 MB, 0 scans), `idx_message_key_remotejid_ts` (16 MB, 0), `idx_message_instance_timestamp` (BRIN duplicado), `MessageUpdate_instanceId_remoteJid_keyId_idx` (0). **Manter** `Message_instanceId_keyId_uniq` (é a trava de duplicata T15). `_baileys_error_events` (380k/76 MB): purge para 30 d e agregação horária; `_audit_outbound_trap` (72 MB): 30 d. `max_wal_size 1→2 GB`.
      Aceite: PG14 `evolution` < 600 MB; Evolution sem erro Prisma sobre índice ausente (Prisma não gerencia esses índices).
      Rollback: recriar índices (definições em 1.7).

- [ ] **Etapa 75 · Watchdogs com restart automático: política única** · A1
      `baileys-watchdog` (replicas 0) e `canary` foram causa raiz dos 8,7 dias. Política: **nenhum watchdog reinicia a Evolution**; só alerta. `canary`: `FAIL_THRESHOLD` → alerta warroom + Sentry, sem `ForceUpdate`. Reativar `wpp2-session-expiry-watchdog` (cron 120) como alerta P1 se `state != open` por > 5 min em horário comercial (a doc do CLAUDE.md diz "aguardar <5 min").
      Aceite: `stacks/whatsapp-watchdog.yml` v3 no repo = Portainer (stack 230) e sem chamada a `docker service update`; cron 120 `active=true`.
      Rollback: versão anterior do stack.

- [ ] **Etapa 76 · `evolution_rabbit_consumer_stats`: 30 s → 5 min e colunas mortas** · A1
      113k linhas em 60 d. `STATS_INTERVAL=300` no consumer; dropar colunas nunca escritas (`instance, ok_count, retry_count, drop_count, filas_ok`) ⚠️ após grep em `evolution-consumer-stats` edge e views.
      Aceite: 288 linhas/dia por réplica; view `v_evolution_pipeline_health` ok.
      Rollback: colunas recriadas.

- [ ] **Etapa 77 · pg_cron: matar zumbis `connecting` e retenção de `job_run_details`** · A5
      `DELETE FROM cron.job_run_details WHERE status='connecting' AND start_time IS NULL`; criar cron `purge-cron-run-details-30d` (hoje só 3 dias de histórico) — manter 30 d para `v_cron_health_24h` e auditorias.
      Aceite: 0 linhas `connecting`; `min(start_time)` cresce até 30 d.
      Rollback: n/a.

- [ ] **Etapa 78 · pg_cron: famílias de retenção sobrepostas e jobs órfãos** · A5
      Consolidar: `purge-webhook-events-7d` × `webhook-purge-consolidated(14d)` × `retention_webhook_partitions(3m)`; `purge_evolution_alerts` × `auto-resolve-pipeline-alerts` × `vacuum-alerts-daily`; `expire-old-media-queue` (inativo) × `auto-expire-old-media-queue` × `purge-media-queue-and-scan-log`. Desagendar o inativo `expire-old-media-queue` (job 9). Documentar em `docs/ops/CRON-MATRIX.md` a família final (1 job por tabela por política).
      Aceite: `cron.job` evo ≤ 80 jobs; matriz commitada.
      Rollback: `cron.schedule` de volta (comandos guardados).

- [ ] **Etapa 79 · pg_cron: jobs caros** · A5
      `lid-regression-suite-2h` (11 s ×12/dia) → 1×/dia; `lid-convergence-snapshot-hourly` (*/15 mas nome diz hourly) → hourly; `refresh_mv_daily_kpis` hourly → 4×/dia; `evo-reconcile-media-fk-orphans` */15 → hourly (fila morta). `cron.max_running_jobs=6` mantido.
      Aceite: `v_cron_health_24h` soma de duração < 10 min/dia.
      Rollback: schedules anteriores.

- [ ] **Etapa 80 · Alertas: fechar ruído** · A5
      `license_heartbeat` (58 critical, endpoint `HTTP=NULL` desde 26/08): localizar cron `onda2_license_monitor` — corrigir URL ou desagendar (Evolution API não tem licença; se for o Evolution Manager, apontar para o endpoint certo). `wal_slot_absent` (68): slot `cainophile` é do Logflare (`supabase_analytics`); decidir memória do container (1 GB OOM) ou silenciar o alerta para esse slot. `401 DETECTION BLIND` (422): `traefik-ops_collector-401` grava em `evolution_traefik_401_stats` (6.548 inserts recentes) → o detector está olhando a tabela/coluna errada — corrigir. Resolver os 141 abertos com `resolved_by='plano100'`.
      Aceite: `evolution_alerts` abertos ≤ 10; nenhum novo `license_heartbeat`/`wal_slot_absent` em 24 h.
      Rollback: n/a.

- [ ] **Etapa 81 · Disco 86%: plano de espaço** · A1
      Host `/` 165/194 GB. Itens: camadas dos 7 runners (janitor já existe — verificar `docker system df`), Supabase Storage `whatsapp-media` (12 GB, sem cópia no R2), PG14 logs (`_baileys_error_events`), `evolution_messages_wpp2` (363 MB — pequeno). Meta ≤ 75%.
      Aceite: `df -h /` ≤ 75%; `warroom_alerts` `DISK FREEZE` = 0 em 7 d.
      Rollback: n/a.

- [ ] **Etapa 82 · `evolution-sync.setupWebhook` (registra webhook direto) — remover** · A2
      `evolution-sync-actions.ts:236-237, 329-330` permite admin religar webhook nativo (viola A13). Remover a action ou fazê-la `enabled=false` sempre; CI `decouple-guard.yml` passa a barrar `webhook/set`.
      Aceite: grep `webhook/set` em `supabase/functions` = 0 fora de testes; guard verde.
      Rollback: revert.

- [ ] **Etapa 83 · GitOps: drift gate do schema `evo` verde** · A5
      `evo-schema-drift-gate.yml` falha desde 24/08. Regenerar `db/schema/schema-evo.sql` a partir do banco (pós-Fase 3/4), ajustar o gate para ignorar `_recon_*`/partições mensais dinâmicas.
      Aceite: workflow verde 3 execuções seguidas.
      Rollback: n/a.

- [ ] **Etapa 84 · Checkpoint da Fase 5**
      `v_cron_health_24h` sem falhas; alertas ≤ 10; disco ≤ 75%; watchdogs sem restart; PG14 < 600 MB.
      Aceite: tabela antes/depois.
      Rollback: n/a.

### FASE 6 — Documentação para agentes de IA e observabilidade (etapas 85–95) · A5

- [ ] **Etapa 85 · `COMMENT ON` faltantes**
      `evo.lid_phone_map_invalid_archive` (tabela + 2 colunas), views `v_ai_health_summary`, `v_kpi_overview`, `zapp.realtime_message_fanout` (18 colunas), `zapp.instance_registry` (1). Padrão: 1ª frase = papel; 2ª = chave/JOIN; 3ª = armadilha; 4ª = quem escreve/quem lê.
      Aceite: `evo.v_doc_coverage` 100% em todas; `evo-schema-guardian-weekly` sem alerta.
      Rollback: n/a.

- [ ] **Etapa 86 · Comentários de tabela com "quem escreve / quem lê / retenção"**
      Para as 25 tabelas do domínio (messages, conversations, contacts, ledger, webhook_events_v2, media_*, lid_*, contact_identity, connection_history, consumer_stats, backlog_history, pipeline_health_log, reconcile_*, alert_cooldown, guardian_heartbeat, whatsapp_check_queue, e2e_probe_results, pipeline_canary_log, bootstrap_log, retention_log, backfill_audit, traefik_401_stats): acrescentar ao COMMENT `Escrita: <edge/trigger/cron>. Leitura: <front/cron/BI>. Retenção: <cron/dias>.`
      Aceite: `SELECT count(*) FROM pg_class c WHERE relnamespace='evo'::regnamespace AND relkind='r' AND obj_description(c.oid) NOT LIKE '%Escrita:%'` = 0 para as 25.
      Rollback: n/a.

- [ ] **Etapa 87 · `evo.v_ai_catalog` + `v_ai_dataflow`: incluir crons e edge functions**
      Estender `v_ai_dataflow` com linhas vindas de `cron.job` (comando → tabelas tocadas via regex) e uma tabela estática `evo.ai_edge_functions(name, events_handled text[], tables_written text[], tables_read text[], caller)` preenchida a partir da tabela (b) do relatório do Agente 2.
      Aceite: `SELECT count(*) FROM evo.v_ai_dataflow WHERE source_kind='cron'` ≥ 80; `ai_edge_functions` com 11 linhas.
      Rollback: DROP.

- [ ] **Etapa 88 · Dicionário de vocabulários**
      `evo.ai_vocab(column_ref text, value text, meaning text)` com `message_type` (canônico), `status`, `media_status`, `direction`, `conversations.status`, `lid_phone_map.confidence`, `ingest_ledger.outcome/reject_reason`, `webhook_events_v2.status`. COMMENT nas colunas apontando para `ai_vocab`.
      Aceite: 8 colunas cobertas.
      Rollback: DROP.

- [ ] **Etapa 89 · Atualizar `CLAUDE.md` do zapp-web-v3 (seção Banco de Dados)**
      Corrigir: 76 tabelas em `evo` (não 136), partições reais, `evolution_media`/`whatsapp_status` (onde ficarem após etapa 69), realtime, fronteira, PG14 como fonte primária + FDW, vocabulários canônicos, SLO. Remover parágrafos "revalidado em 08-20" obsoletos.
      Aceite: PR mergeado; `graphify update` roda.
      Rollback: revert.

- [ ] **Etapa 90 · Atualizar `CLAUDE.md`/`AGENTS.md` do evolution-stack**
      Eventos RabbitMQ = API (não env); política de watchdog sem restart; digest atual; consumer com workflow de build; DLQ em `public._consumer_dlq` (PG14); PG14 retenções.
      Aceite: PR mergeado; docs contraditórios listados no risco A1-#24 marcados como obsoletos (`docs/history/`).
      Rollback: revert.

- [ ] **Etapa 91 · `docs/SCHEMA_REFERENCE.md` e `ER_DIAGRAM.md` regenerados do banco**
      Script `scripts/gen-schema-docs.mjs` (Node, sem python) lendo `information_schema` + `pg_description` → markdown. Rodar e commitar.
      Aceite: docs batem com `v_ai_catalog` (mesma contagem de tabelas/colunas).
      Rollback: n/a.

- [ ] **Etapa 92 · `types.ts` regenerado (drift de 36+ dias)**
      `META_URL=http://10.0.1.52:8080 node scripts/gen-types.mjs` no container `claude-code`; incluir `evo` em `included_schemas` só para tipos (REST continua `zapp`). Resolver alerta `types_schema_drift`.
      Aceite: `bun run typecheck` verde; alerta resolvido; cron `types-drift-weekly` sem DRIFT.
      Rollback: revert.

- [ ] **Etapa 93 · Dashboard único de saúde do pipeline (Metabase ou artifact)**
      Fontes: `v_latency_breakdown_24h`, `recon_coverage_daily` (in+out), `rabbitmq_backlog_history`, `v_cron_health_24h`, `v_alert_dashboard`, `v_wpp2_uptime_24h`. 6 tiles.
      Aceite: URL publicada no `ESTADO.md`.
      Rollback: n/a.

- [ ] **Etapa 94 · Runbook "mensagem não chegou no CRM" (para agentes de IA)**
      `runbooks/RUNBOOK_MENSAGEM_NAO_CHEGOU.md`: 8 queries em ordem (PG14 `Message` por `key->>'id'` → `rabbitmq_backlog_history` → `webhook_audit_log` → `ingest_ledger` → `evolution_messages` → `realtime_message_fanout` → `evolution_webhook_dlq` → `_consumer_dlq`), com o que cada resultado significa.
      Aceite: runbook testado com 1 id real.
      Rollback: n/a.

- [ ] **Etapa 95 · Checkpoint da Fase 6**
      `v_doc_coverage` 100%; `v_ai_health_summary` HEALTHY; CLAUDE.md dos 2 repos atualizados; drift gates verdes.
      Aceite: tabela.
      Rollback: n/a.

### FASE 7 — Validação final ponta a ponta (etapas 96–100) · todos

- [ ] **Etapa 96 · Teste E2E inbound** · A1
      De outro número: 1 texto, 1 imagem, 1 áudio, 1 documento, 1 reação, 1 mensagem em grupo. Medir por `ingest_ledger` os 4 timestamps e o estado final em `evolution_messages`/`evolution_reactions`.
      Aceite: 5/5 no espelho (grupo by design fora), p95 < 10 s, mídia `ready` < 2 min.
      Rollback: n/a.

- [ ] **Etapa 97 · Teste E2E outbound** · A2
      Pelo CRM: 1 texto, 1 imagem, 1 áudio, 1 documento para um contato PN e para um contato LID. Verificar `send.message` + `messages.upsert` reconciliados em **uma** linha por mensagem com `media_*` preenchidos, `status` progredindo `sent→delivered→read` (ACK do PG14 sem erro T21).
      Aceite: 8/8 linhas únicas; `v_dedup_failures` = 0; status `read` chega em ≤ 30 s após leitura no celular.
      Rollback: n/a.

- [ ] **Etapa 98 · Teste de resiliência: queda do consumer e da edge** · A3 + A1
      `docker service scale evolution-rabbit-consumer_consumer=0` por 5 min com tráfego de teste → fila acumula → `scale=2` → drena sem perda/duplicata. Idem parar `supabase_functions` 2 min → consumer retenta (503) → 0 drops (`drop_by` inalterado), DLQ vazia.
      Aceite: contagem PG14 = espelho para a janela; `consumer_stats.drop` inalterado.
      Rollback: scale de volta.

- [ ] **Etapa 99 · Teste de reconexão: `messages.set` recupera histórico** · A4 · dep: 15
      Em janela morta: `evo_instance_restart wpp2`; após `open`, verificar fila `messages.set` consumida e mensagens do intervalo presentes sem duplicar.
      Aceite: `v_dedup_failures`=0; `missing_real_24h`=0.
      Rollback: n/a.

- [ ] **Etapa 100 · Fechamento: relatório antes/depois e ESTADO.md** · A5
      Consolidar baseline (etapa 2) × final para as 30 métricas; listar o que ficou pendente (decisões do dono: R2 vs Storage, presença no CRM, mensagens de grupo no CRM); marcar `audit100_baseline` com `tag='plano100-evo-2026-09-final'`; PR final nos 2 repos; `graphify update` em ambos.
      Aceite: PRs mergeados; SLO da etapa 6 atendido por 7 dias consecutivos.
      Rollback: n/a.

---

## 3. Decisões que só o dono pode tomar (perguntar antes das etapas marcadas)

1. **Mensagens de grupo** no CRM: hoje rejeitadas por design. Manter? (afeta etapas 10, 19, 96)
2. **Presença (`presence.update`)** no CRM: manter evento e consumir, ou desligar. (etapa 10)
3. **Mídia**: consolidar em Supabase Storage (atual, 12 GB no disco a 86%) ou migrar para R2 (config já aponta R2). Custo. (etapa 67)
4. **`DATABASE_SAVE_DATA_MESSAGE_UPDATE`** no PG14: manter ACKs no PG14 (cresce) ou desligar. (etapas 27, 73)
5. **BI com PII bruta** (`metabase_reader`/`om_reader`): mascarar. (etapa 52)
6. **Histórico perdido de 26/08→02/09**: não é recuperável por API (Baileys não ressincroniza sem `syncFullHistory` no pareamento). Aceitar a perda e registrar no `ESTADO.md`.

---

## 4. Referências desta auditoria

- Relatórios dos agentes (sessão 2026-09-05): infra/broker, ingestão/edge, automação SQL — consolidados na seção 1 e nos riscos citados (A1-#1…#25, A2-#1…#15).
- PRs abertos relacionados: `evolution-stack#109` (revalidação GAP-1/GAP-5, drift A5 persiste), `zapp-web-v3#1530` (mergeado, análise de arquitetura).
- Queries de verificação usadas (reexecutáveis): ver `docs/plano100/queries-auditoria-2026-09-05.sql` (mesmo diretório deste arquivo).
