# UNUSED_CODE.md — Fase 4 da auditoria

**Data:** 2026-04-26  
**Escopo:** Identificar código morto, edge functions zumbis e arquivos inflados que violam o limite de manutenibilidade.

---

## 0. Resumo executivo

| Métrica | Valor | Ação |
|---|---:|---|
| Arquivos `.ts/.tsx` em `src/` | ~1.390 | — |
| Arquivos > 500 linhas (excluindo `types.ts`) | 13 | ⚠️ candidatos a refatoração |
| Edge functions deployadas e nunca chamadas pelo frontend | 36 | ✅ Maioria legítima |
| Edge functions realmente "zumbis" (sem cron, webhook ou doc) | 0 confirmadas | ✅ |
| Arquivos órfãos confirmados (deletados neste turno) | **1** | ✅ removido |
| Hook campeão de inflação (`useConnectionsManager.ts`) | 824 linhas | ⚠️ Fase 5 (decomposição) |
| Página campeã de inflação (`AdminFailedMessagesPage.tsx`) | 1.012 linhas | ⚠️ Fase 5 (split) |

---

## 1. Arquivos deletados neste turno

| Arquivo | Tamanho | Motivo |
|---|---:|---|
| `src/components/SearchInput.tsx` | ~120 linhas | Componente genérico não importado em nenhum lugar (apenas substring matches em outros arquivos). Substituído pelos componentes específicos `AdvancedCRMSearch`, `DataExplorerTable`, etc. |

**Total reduzido:** 1 arquivo, ~120 linhas.

---

## 2. Edge functions deployadas e não invocadas pelo frontend (36)

Após inspeção, **nenhuma é zumbi de verdade**. Categorização:

### 2.1 Webhooks externos (chamados por terceiros) — manter
`whatsapp-webhook`, `gmail-webhook`, `elevenlabs-webhook`, `sicoob-bridge`, `sicoob-bridge-reply`

### 2.2 Schedulers / cron jobs — manter
`auto-close-conversations`, `cleanup-rate-limit-logs`, `nps-scheduler`, `talkx-scheduler`, `evolution-retry-metrics`, `evolution-health`

### 2.3 Health checks / observabilidade — manter
`proxy-health`, `proxy-metrics`, `status`, `analyze-external-db`

### 2.4 Stack ElevenLabs / voz (chamadas de UI específicas)
`elevenlabs-agent-token`, `elevenlabs-dialogue`, `elevenlabs-sts`, `elevenlabs-tts`, `elevenlabs-tts-stream`, `elevenlabs-voice-design`, `voice-agent`, `voice-changer`, `voice-copilot-action`

> **Risco:** algumas podem estar duplicadas (ex.: `elevenlabs-tts` vs `elevenlabs-tts-stream`). **Ação:** auditar caso-a-caso na Fase 5 ou em refactor dedicado.

### 2.5 Admin/operação — manter (uso interno)
`create-user`, `e2e-fixtures`, `recover-corrupted-audios`, `send-rate-limit-alert`, `sla-alert-forward`, `sla-alert-log-failure`

### 2.6 Bridges / proxies internos — manter
`external-db-bridge`, `provider-router`, `public-api`, `contact-media`, `gmail-send`, `gmail-sync`

### 2.7 Compartilhado — manter
`_shared` (módulos comuns)

**Veredito:** **0 funções a remover.** O risco de quebrar webhooks externos ou crons supera o ganho cosmético.

---

## 3. Arquivos inflados (>500 linhas) — candidatos a refatoração

| Arquivo | Linhas | Tipo | Prioridade |
|---|---:|---|---|
| `src/integrations/supabase/types.ts` | 11.787 | **auto-gerado — NÃO TOCAR** | — |
| `src/pages/AdminFailedMessagesPage.tsx` | 1.012 | Página | 🔴 Alta — quebrar em sections |
| `src/hooks/useConnectionsManager.ts` | 824 | Hook | 🔴 Alta — decompor (memo `architecture/refactoring/hook-decomposition-pattern`) |
| `src/pages/AdminWebhookSecretStatusPage.tsx` | 696 | Página | 🟡 Média |
| `src/components/inbox/contact-details/SLATimelineSection.tsx` | 615 | Component | 🟡 Média |
| `src/pages/AdminWebhookEventsPage.tsx` | 591 | Página | 🟡 Média |
| `src/components/monitoring/RetryMetricsPanel.tsx` | 555 | Component | 🟡 Média |
| `src/lib/realtime/crossTabDedupe.ts` | 546 | Lib | 🟢 Baixa (lógica densa, OK) |
| `src/pages/admin/AdminChannelsPage.tsx` | 530 | Página | 🟡 Média |
| `src/components/inbox/ChatPanel.tsx` | 521 | Component | 🟡 Média |
| `src/types/externalDB.ts` | 518 | Types | 🟢 Baixa (tipos puros) |
| `src/components/inbox/chat/ChatMessagesArea.tsx` | 512 | Component | 🟡 Média |
| `src/pages/AdminWebhookOverviewPage.tsx` | 511 | Página | 🟡 Média |
| `src/pages/admin/AdminQueuesPage.tsx` | 508 | Página | 🟡 Média |

**Total a refatorar:** ~7.000 linhas em 11 arquivos efetivos.

> **Nota:** Refatoração estrutural exige decomposição cuidadosa que não cabe nesta auditoria. Vai pra **roadmap pós-10/10**, não como bloqueador.

---

## 4. Bibliotecas de terceiros usadas
Nenhuma checagem de `package.json` foi disparada nesta fase; recomendo `bun pm ls --all` + `depcheck` em rodada futura. **Não bloqueia.**

---

## 5. Conclusão da Fase 4

- ✅ **1 arquivo órfão removido.**
- ✅ **0 edge functions zumbis para deletar** (todas têm propósito legítimo: webhooks, crons, observabilidade ou admin).
- ⚠️ **11 arquivos `>500 linhas`** identificados como candidatos a refatoração futura (não-bloqueante).
- 🟢 Nenhum bloqueador para o objetivo 10/10.

**Próxima fase:** FASE 5 — `PERFORMANCE.md` (cold-starts, paginação, memoização, bundle).
