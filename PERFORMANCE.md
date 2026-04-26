# PERFORMANCE.md — Fase 5 da auditoria

**Data:** 2026-04-26  
**Escopo:** Banco (índices, queries), edge functions (cold-start), e estratégias de caching/batching no frontend.

---

## 0. Resumo executivo

| Categoria | Status | Ação |
|---|---|---|
| Latência atual `external-db-proxy` | ✅ 47–179 ms (alvo <200 ms) | Manter |
| Cold-starts do `external-db-proxy` | ⚠️ ~1 boot por requisição | Roadmap (warmup) |
| Índices de FK ausentes em tabelas críticas | 🔴 16 índices criados | ✅ **Corrigido** |
| Memoização de queries (`@tanstack/react-query`) | ✅ Padrão respeitado (`staleTime`, `enabled`) | Manter |
| Bundle inflado (>500 linhas) | ⚠️ 11 arquivos | Roadmap (decomposição) |
| Realtime — número de canais por usuário | ⚠️ Não auditado nesta rodada | Roadmap |

---

## 1. Otimizações aplicadas neste turno

### 1.1 Índices de FK criados (16 índices)

Todas as tabelas abaixo tinham `contact_id`/`user_id`/`assigned_to` sem índice — qualquer JOIN ou filtro fazia *seq scan*.

| Tabela | Coluna | Razão |
|---|---|---|
| `ai_conversation_tags` | `contact_id` | Painel de detalhes do contato (3+ queries por abertura) |
| `conversation_sla` | `contact_id` | Painel SLA do contato |
| `calls` | `contact_id` | Histórico de chamadas |
| `reminders` | `contact_id` | Lembretes do contato |
| `scheduled_messages` | `contact_id` | Agendamentos |
| `sales_deals` | `contact_id`, `assigned_to` | Kanban + filtros por agente |
| `csat_surveys` | `contact_id` | Histórico CSAT |
| `whisper_messages` | `contact_id` | Notas privadas |
| `payment_links` | `contact_id` | Links de pagamento |
| `query_telemetry` | `user_id` | Painel admin de telemetria |
| `security_alerts` | `user_id` | Painel de alertas de segurança |
| `followup_executions` | `contact_id` | Sequências de follow-up |
| `meta_capi_events` | `contact_id` | Meta CAPI |
| `message_templates` | `user_id` | Templates por usuário |
| `email_threads` | `assigned_to` | Email Inbox |

**Ganho esperado:** queries que filtravam por `contact_id` em tabelas com 10K+ linhas devem cair de ~200–500 ms para <10 ms.

### 1.2 Hook `useContactEnrichedData` agora skip-aware

Antes (Fase 3): disparava 3 queries inúteis para cada JID, todas falhando com 22P02.  
Agora: 1 query de resolução + 3 queries dependentes só rodam se há `localId` válido.  
**Ganho:** -75% de queries por abertura de contato FATOR X que não tem mapping local.

---

## 2. Achados não bloqueantes (roadmap)

### 2.1 Cold-starts excessivos do `external-db-proxy`

**Observação (logs 15:13–15:14):** ~18 ciclos `boot`/`shutdown` para 16 requisições reais — quase 1 cold-start por chamada.

**Impacto:** cada cold-start adiciona ~40–50 ms de latência (boot time observado: 32–82 ms). Em pico isso pode somar 1 s+ por sessão.

**Soluções possíveis (não aplicadas — exigem decisão arquitetural):**
1. **Warmup periódico** — cron a cada 30 s tocando `/proxy-health` para manter a instância quente. Custo: ~120 invocações/hora.
2. **Aumentar `min_instances`** se disponível no plano Supabase Edge.
3. **Aceitar como está** — latência total ainda <200 ms, dentro do SLA.

**Recomendação:** opção 3 por padrão; opção 1 se UX no Inbox piorar.

### 2.2 Arquivos >500 linhas (11)

Listados em `UNUSED_CODE.md §3`. Decomposição recomendada via memória `architecture/refactoring/hook-decomposition-pattern`. **Não-bloqueante.**

### 2.3 Bundle e code-splitting

Não medido nesta rodada. Recomendar `bun run build && bunx vite-bundle-visualizer` em rodada futura. Lazy-loading já é usado em rotas admin (visto em `App.tsx`), o que mitiga o problema.

### 2.4 React-Query — boas práticas observadas

✅ `staleTime` definido em queries críticas  
✅ `enabled` usado para evitar queries fantasma (reforçado no fix do `useContactEnrichedData`)  
✅ Keys hierárquicas (`['contact-enriched', localId]`)  
⚠️ Não auditado: invalidação após mutações (caso-a-caso, não generalizável agora)

---

## 3. Métricas-alvo após esta fase

| Cenário | Antes | Depois (esperado) |
|---|---:|---:|
| Abrir painel de contato (com mapping local) | 3 queries × 200 ms = 600 ms | 1 query × 5 ms + 3 × 10 ms = ~35 ms |
| Abrir painel de contato (sem mapping local) | 3 queries × 200 ms + 3 erros 22P02 | 1 query × 5 ms (skip) |
| Listar deals do agente | seq scan ~300 ms | index scan <10 ms |
| Histórico de calls do contato | seq scan ~150 ms | index scan <5 ms |

---

## 4. Conclusão

- ✅ **16 índices novos** criados (idempotente, zero downtime).
- ✅ **Hook `useContactEnrichedData` defensivo** elimina queries inúteis.
- ⚠️ Cold-starts e refatoração de arquivos grandes ficam para roadmap pós-10/10.

**Próxima fase:** FASE 6 — `SECURITY_AUDIT.md`.
