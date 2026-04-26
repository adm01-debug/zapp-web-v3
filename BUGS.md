# BUGS.md — Fase 3 da auditoria

**Data:** 2026-04-26  
**Escopo:** Catalogação de bugs reais detectados em runtime (logs, console, network, replay) e via inspeção de código cruzada com a Fase 2.

---

## 0. Atualização de diagnóstico vs prompt original

| Sintoma alegado no prompt | Status real (verificado em 26/04/2026) |
|---|---|
| `external-db-proxy` retornando 503 | ❌ **Não reproduz.** Última janela (15:13–15:14 UTC): 100% das chamadas com `status:200`, `pg_timeout:false`, `timeout_fired:false`. |
| Queries de 7–15 s no Inbox | ❌ **Não reproduz.** Latências observadas: **47 ms a 179 ms** (média ~95 ms). |
| `useContactEnrichedData` lança 22P02 (UUID) | ✅ **CONFIRMADO** por inspeção de código (sem trace ativo no console agora — o erro é silenciado por `log.error` mas degrada a UX). |

Os primeiros dois itens foram **resolvidos por correções anteriores** (memória `architecture/messaging/delivery-and-fallback-system` e otimizações do proxy). Permanecem na lista como **regressões a monitorar**.

---

## 1. Bugs catalogados

### 🔴 BUG-001 — JID enviado em coluna UUID (`useContactEnrichedData`)

**Severidade:** P1 (silencioso, mas degrada o painel de detalhes do contato)  
**Arquivos:** `src/hooks/useContactEnrichedData.ts`, `src/components/inbox/ContactDetails.tsx`, `src/adapters/evolutionAdapter.ts:204`

**Causa raiz:**
1. `evolutionAdapter.ts:204` define `contact.id = dc.remoteJid` (ex.: `5511999999999@s.whatsapp.net`).
2. `ContactDetails.tsx:40` propaga esse JID como `contactId` para `useContactEnrichedData`.
3. O hook chama `supabase.from('contacts').eq('id', jid)` — coluna `contacts.id` é **UUID**.
4. Postgres rejeita com `22P02: invalid input syntax for type uuid`.
5. Os 3 painéis dependentes (enriched data, AI tags, SLA) ficam vazios silenciosamente.

**Fix aplicado (este turno):**
- Novo helper `resolveLocalContactId()` valida UUID com regex `/^[0-9a-f]{8}-...$/i`.
- Quando recebe JID, extrai dígitos via `jidToPhone()` e faz lookup em `contacts` por `phone` (eq exato + ilike trailing-8).
- Os 3 queries dependentes agora usam o `localId` resolvido e ficam `enabled: !!localId`.
- `staleTime: 5min` no resolver — mapping JID→UUID é praticamente imutável.

**Resultado esperado:** zero erros 22P02; painel preenche dados quando o contato existe na base local; quando não existe, fica vazio sem ruído.

---

### 🟡 BUG-002 — Policy permissiva em `send_failures.INSERT`

**Severidade:** P2 (risco de poluição de log, sem vazamento de dados)  
**Arquivo:** Banco — `public.send_failures`

**Causa raiz:** Policy `Authenticated can insert send failures` aceita `WITH CHECK(true)` para qualquer usuário autenticado. Permite que um cliente comprometido injete entradas falsas no log.

**Fix proposto (a aprovar):** restringir com `WITH CHECK (recorded_by = auth.uid() OR recorded_by IS NULL)` ou trocar para `service_role` se a tabela é populada apenas por edge functions.

**Não corrigido neste turno** — exige migração e validação de quem escreve nessa tabela. Vai pra Fase 6 (`SECURITY_AUDIT.md`).

---

### 🟢 BUG-003 — Logs de boot/shutdown excessivos do `external-db-proxy`

**Severidade:** P3 (cosmético / custo de logging)  
**Observação:** Em ~80 segundos de logs (15:13:30 → 15:14:43), há **18 ciclos `boot`+`shutdown`** intercalados com 16 requisições reais. Indica que cada invocação está cold-starting uma instância nova.

**Causa provável:** baixo `min_instances` ou QPS abaixo do limiar de keep-warm.

**Fix proposto:** ajustar configuração ou adicionar warmup periódico. Não bloqueia. Vai pra Fase 5 (`PERFORMANCE.md`).

---

### 🟢 BUG-004 — Warning de mensagem desconhecida no preview

**Severidade:** P3 (cosmético, não-funcional)  
**Console:** `warning: Unknown message type: RESET_BLANK_CHECK at lovable.js:120`

**Causa:** mensagem do iframe da plataforma Lovable, não do app. **Ignorar.**

---

## 2. Bugs do prompt original que NÃO se confirmaram

| ID | Descrição | Status | Evidência |
|---|---|---|---|
| ~~BUG-503~~ | `external-db-proxy` 503 | ❌ Não reproduz | Logs mostram 100% 200 OK em 50–180ms |
| ~~BUG-SLOW~~ | Queries 7–15s no Inbox | ❌ Não reproduz | `pg_timeout:false`, `timeout_fired:false`, `total_ms` < 200 |

Caso voltem a aparecer, abrir BUG novo com janela temporal e CIDs do log.

---

## 3. Outros pontos verificados sem bug

- ✅ Nenhuma chamada `.from(table)` aponta para tabela inexistente (Fase 2).
- ✅ Nenhuma `.rpc(name)` aponta para RPC inexistente (Fase 2).
- ✅ Todas as 43 edge functions invocadas estão deployadas (Fase 2).
- ✅ RLS habilitada em 184/184 tabelas (Fase 2).
- ✅ Console atual: zero erros JS, zero unhandled rejections.
- ✅ Network atual: zero respostas 4xx/5xx do `external-db-proxy`.

---

## 4. Resumo numérico

| Severidade | Qtd | Corrigido neste turno |
|---|---:|---:|
| 🔴 P0 (crítico) | 0 | 0 |
| 🔴 P1 (alto) | 1 | **1** ✅ |
| 🟡 P2 (médio) | 1 | 0 (delegado p/ Fase 6) |
| 🟢 P3 (baixo) | 2 | 0 (delegado p/ Fase 5) |
| **Total** | **4** | **1** |

---

**Próxima fase:** FASE 4 — `UNUSED_CODE.md` (36 edge functions zumbis, hooks/componentes >500 linhas, dependências importadas e nunca usadas).
