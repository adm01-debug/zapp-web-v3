# Endurecimento de Segurança no Banco — RLS + search_path

> ⚠️ **Estas migrações auto-aplicam em produção ao entrar na `main`.**
> **VALIDAR EM STAGING ANTES DE MERGEAR.** Mantido como PR **draft** de propósito.

Contexto: o projeto não tem coluna multi-tenant; o isolamento é **por usuário**
(`auth.uid() = <coluna de propriedade>`) **+ por papel** (`has_role` / admin / supervisor),
numa única organização. Estas migrações corrigem dois achados críticos da varredura.

## Arquivos
| Arquivo | O que faz |
|---|---|
| `supabase/migrations/20260529120000_harden_security_definer_search_path.sql` | Fixa `search_path` em toda função `SECURITY DEFINER` do schema `public` que não tenha (corrige search_path injection). Idempotente, auto-descobrível via `pg_proc`. |
| `supabase/migrations/20260529120100_harden_rls_replace_using_true.sql` | Substitui políticas `USING (true)`/`WITH CHECK (true)`. Auto-direcionada via `pg_policy`. |
| `supabase/manual-rollbacks/20260529120100_harden_rls_DOWN.sql` | Rollback **manual** (não auto-aplica) que reabre as tabelas afetadas em emergência. |

## Regras aplicadas pela migração de RLS
- **Tabela COM coluna de propriedade** (`user_id`→`created_by`→`agent_id`→`uploaded_by`→`owner_id`, nessa ordem):
  acesso total (SELECT/INSERT/UPDATE/DELETE) = **dono OU admin OU supervisor**.
- **Tabela SEM coluna de propriedade** (catálogos/config compartilhados):
  **leitura** preservada para autenticados (`auth.uid() IS NOT NULL`); **escrita** só admin/supervisor.
- Só toca políticas cujo USING/WITH CHECK é **literalmente `true`** — não mexe em políticas já corretas.
- Concede `EXECUTE` em `public.has_role(uuid, app_role)` a `authenticated` (evita lockout por GRANT revogado).

## ✅ Validação obrigatória antes de mergear (rodar no projeto real — read-only)

**1. Preview — quais tabelas/colunas serão afetadas:**
```sql
SELECT sub.relname AS table_name,
  COALESCE((
    SELECT v.col FROM (VALUES ('user_id'),('created_by'),('agent_id'),('uploaded_by'),('owner_id')) v(col)
    WHERE EXISTS (SELECT 1 FROM information_schema.columns ic
                  WHERE ic.table_schema='public' AND ic.table_name=sub.relname AND ic.column_name=v.col)
    ORDER BY array_position(ARRAY['user_id','created_by','agent_id','uploaded_by','owner_id'], v.col) LIMIT 1
  ), '<ownerless>') AS owner_col
FROM (
  SELECT DISTINCT c.oid, c.relname
  FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public'
    AND (pg_get_expr(p.polqual,p.polrelid)='true' OR pg_get_expr(p.polwithcheck,p.polrelid)='true')
) sub ORDER BY 1;
```
Revise a lista: confirme que toda tabela marcada `<ownerless>` é realmente catálogo/config
compartilhada, e que a `owner_col` detectada é a coluna correta de propriedade.

**2. Confirme que `has_role` é `SECURITY DEFINER`** (senão pode haver RLS recursivo):
```sql
SELECT proname, prosecdef FROM pg_proc WHERE proname='has_role';
```

**3. Aplique em STAGING e teste os fluxos chave** com um usuário comum (agente):
inbox, conexões, automações, templates, escrita em catálogos usados pela UI.

## ⚠️ Riscos conhecidos (por que validar)
- Não foi possível validar contra o banco real desta sessão (o MCP disponível aponta para outro projeto).
- Tabelas onde um **agente comum** precisa ler dados de **outro** usuário (sem ser admin/supervisor)
  passarão a ser bloqueadas — reveja no preview.
- Tabelas que hoje têm leitura `anon` (públicas) perdem o acesso anônimo (passa a exigir autenticação).
- Catálogos onde agentes comuns **criam/editam** registros (ex.: respostas rápidas) terão a escrita
  restrita a admin/supervisor — ajuste a regra se isso for indesejado para alguma tabela.

## Rollback de emergência
Rodar manualmente `supabase/manual-rollbacks/20260529120100_harden_rls_DOWN.sql` (reabre as tabelas
afetadas com acesso permissivo — estado inseguro, só medida temporária).
