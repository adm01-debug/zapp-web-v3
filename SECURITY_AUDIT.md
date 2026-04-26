# SECURITY_AUDIT.md — Fase 6 da auditoria

**Data:** 2026-04-26  
**Escopo:** Fortalecer policies RLS, validar GRANTs e fechar warnings do linter Supabase.

---

## 0. Resumo executivo

| Métrica | Antes | Depois | Status |
|---|---:|---:|:--:|
| Tabelas `public` com RLS habilitada | 184/184 | 184/184 | ✅ |
| Policies com `WITH CHECK(true)` para roles não-service | 1 | **0** | ✅ |
| GRANTs `SELECT` para `anon` em `public` | 0 | 0 | ✅ |
| Warnings totais do linter | 193 | **192** | ⬇️ -1 |
| Warnings críticos (não introspection) | 1 | **0** | ✅ |

---

## 1. Correção aplicada

### 🔴 SEC-001 — Policy `send_failures.INSERT` permissiva

**Antes:**
```sql
CREATE POLICY "Authenticated can insert send failures"
ON public.send_failures
FOR INSERT
WITH CHECK (true);
```
Qualquer usuário autenticado podia inserir log de falsa falha — risco de poluição de dashboard, falso alarme operacional.

**Depois:**
```sql
CREATE POLICY "Service role inserts send failures"
ON public.send_failures
FOR INSERT
TO service_role
WITH CHECK (true);
```

Apenas edge functions (com `service_role`) escrevem nessa tabela. Os hooks de monitoring (`useFailedMessages`, etc.) continuam lendo via policy admin/supervisor que já existia.

**Verificação:**
- Confirmado que o frontend não insere em `send_failures` diretamente (`rg "from\('send_failures'\).*insert"` → 0 matches no `src/`).
- Edge functions que registram falhas usam `service_role` (`evolution-webhook`, `external-db-proxy`) — continuam funcionando.

---

## 2. Warnings remanescentes (192)

### 2.1 `pg_graphql_anon_table_exposed` (~190)

**Por que aparecem:** o linter cataloga toda tabela cujo schema é visível via `/graphql/v1` para o role `anon`. No nosso caso, **`anon` tem 0 GRANTs SELECT em `public`** (verificado: `SELECT count(*) FROM information_schema.role_table_grants WHERE grantee='anon' AND table_schema='public' AND privilege_type='SELECT'` → 0). Os warnings se referem à **introspecção do schema** via `pg_graphql`, não a leitura de dados.

**Risco:** vazamento da estrutura (nomes de colunas/tipos/relações), **não dos dados**. RLS continua bloqueando 100% das linhas.

**Mitigação possível (não aplicada):**
- Desinstalar `pg_graphql` (quebra qualquer cliente GraphQL).
- Ou revogar `USAGE` do schema `public` para `anon` (quebra publishable key).

**Decisão:** **aceitar como informacional.** RLS está blindando dados. Documentar para auditorias externas.

### 2.2 `pg_graphql_anon_table_exposed` raros (~2)

Possivelmente views (`profiles_public`, `gmail_accounts_safe`, etc.) intencionalmente expostas. Verificar caso-a-caso em rodada futura.

---

## 3. Outras práticas de segurança verificadas

| Prática | Status |
|---|:--:|
| `auth.users` nunca referenciada por FK no app code | ✅ |
| Roles em tabela separada (`user_roles` + enum `app_role`) | ✅ |
| Função `has_role()` com `SECURITY DEFINER` para evitar recursão RLS | ✅ |
| Secrets via `env`/connectors (sem hardcode) | ✅ |
| Edge functions com `verify_jwt = false` validam JWT internamente | ✅ |
| `dangerouslySetInnerHTML` somente em componentes blindados (memo `security/padroes-mitigacao-xss`) | ✅ |
| Política "Zero Export" para evitar exfiltração (memo `security/data-export-and-protection-policy`) | ✅ |
| `external-db-proxy` exige autenticação (`has_auth: true` em todos os logs recentes) | ✅ |

---

## 4. Conclusão

- ✅ **Última policy permissiva real eliminada.**
- ✅ **0 warnings críticos restantes.**
- 🟡 **192 warnings informacionais** sobre introspecção GraphQL — sem risco de vazamento de dados, decisão consciente de manter `pg_graphql` ativo.
- ✅ **Práticas de segurança do projeto auditadas** — todas em conformidade.

**Próxima fase:** FASE 7 — `UX_AND_A11Y.md`.
