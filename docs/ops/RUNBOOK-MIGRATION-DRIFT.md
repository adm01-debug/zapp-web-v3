# Runbook — Migration Drift

> Drift = divergência entre arquivos em `supabase/migrations/` e a tabela
> `supabase_migrations.schema_migrations` no banco de produção.

---

## Tipos de drift

| Código | Descrição | Risco |
|--------|-----------|-------|
| `DB_ONLY` | Migration aplicada no banco **sem arquivo no repo** (shadow migration) | 🔴 Alto — impossível auditar o que foi aplicado |
| `REPO_ONLY` | Arquivo no repo **sem entrada no banco** (não aplicada) | 🟡 Médio — funcionalidade ainda não ativa |
| `PREFIX_COLLISION` | Dois arquivos com o mesmo timestamp de 14 chars | 🔴 Alto — Supabase ignora silenciosamente o segundo |
| `NAME_MISMATCH` | Mesmo version, nomes diferentes repo ↔ banco | 🟡 Médio — indica renaming não sincronizado |

---

## Como detectar

```bash
# Local (requer DATABASE_URL com acesso ao banco de produção)
DATABASE_URL="postgres://..." node scripts/check-migration-version-bank-drift.mjs

# CI: workflow migration-drift-guard.yml roda automaticamente em PRs e diariamente
```

---

## Resolver DB_ONLY (shadow migration)

Uma migration aplicada diretamente no banco sem passar pelo repo.

### Opção A — Materializar o SQL (preferencial)

1. Conectar ao banco e recuperar o DDL que foi aplicado:
   ```sql
   -- No Supabase Dashboard → SQL Editor ou via psql
   -- Identificar o que a migration fez (via histórico de sessões, CHANGELOG, etc.)
   ```

2. Criar o arquivo de migration com o mesmo timestamp:
   ```bash
   # Ex.: version=20260901120000, name=correcao_rls_profiles
   cat > supabase/migrations/20260901120000_correcao_rls_profiles.sql << 'EOF'
   -- Migration materializada retroativamente (shadow migration)
   -- Aplicada diretamente no banco em YYYY-MM-DD, materializada em YYYY-MM-DD
   -- Autor: <quem aplicou>

   -- ... SQL que foi aplicado ...
   EOF
   ```

3. Registrar em `docs/ops/MIGRATIONS_CLEANUP_DECISIONS.md`:
   ```
   | 20260901120000 | correcao_rls_profiles | MATERIALIZADO 2026-09-06 | Aplicada manualmente em 2026-09-01; arquivo criado retroativamente |
   ```

4. Commit + PR.

### Opção B — Registrar como tombstone (quando SQL perdido)

Se o SQL original não for recuperável e a mudança for irreversível:

1. Criar o arquivo com comentário explicativo:
   ```sql
   -- TOMBSTONE: migration aplicada manualmente no banco em YYYY-MM-DD
   -- SQL original não recuperado. Estado atual do banco é a fonte da verdade.
   -- Registered: YYYY-MM-DD por <responsável>
   -- Motivo: <contexto>

   -- Este arquivo existe apenas para sincronizar o repo com o banco.
   -- A migration já foi aplicada; este SELECT é no-op seguro.
   SELECT 1; -- tombstone
   ```

2. Adicionar ao MIGRATIONS_CLEANUP_DECISIONS.md como TOMBSTONE.

---

## Resolver REPO_ONLY (migration não aplicada)

Arquivo existe no repo mas sem entrada no banco.

```bash
# Verificar se é rascunho intencional ou esquecimento
# Se deve ser aplicada:
supabase db push --db-url "postgres://..."

# Se é rascunho que não deve ir pro banco ainda:
# Mover para um diretório fora de supabase/migrations/ ou prefixar com "_draft_"
```

---

## Resolver PREFIX_COLLISION

Dois arquivos compartilham o timestamp de 14 chars — o Supabase ignora o segundo.

```bash
# Identificar os arquivos colidentes
ls supabase/migrations/ | cut -c1-14 | sort | uniq -d

# Renumerar o segundo arquivo com um timestamp único
mv supabase/migrations/20260901120000_nome_b.sql \
   supabase/migrations/20260901120001_nome_b.sql
```

---

## Histórico de drifts resolvidos

| Data | Tipo | Quantidade | Resolução |
|------|------|-----------|-----------|
| 2026-09-06 | — | — | Baseline: drift-guard criado; estado inicial não medido aqui |

*Atualizar após cada resolução de drift.*
