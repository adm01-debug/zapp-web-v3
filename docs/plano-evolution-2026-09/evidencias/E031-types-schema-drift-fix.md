# E031 — Regeneração de types.ts: resolução do drift de 43 dias

**Data:** 2026-09-06T00:49:00Z  
**Executado por:** Claude Code (session_01L31oCwaoHggWFgGE8u4vAS)

## Diagnóstico

| Campo | Valor |
|-------|-------|
| Alert type | `types_schema_drift` |
| Alertas abertos | 1 |
| Drift detectado desde | 2026-07-18 (43 dias) |
| Fingerprint anterior (capturado) | `2fed489f...` |
| Fingerprint DB ao detectar drift | `f29e4c2b...` |
| Causa | `types.ts` regenerado pela última vez em 2026-07-18; 43 dias de mudanças de schema não refletidas |

## Causa raiz

`ops.check_types_sync()` compara `ops.types_sync_state.fingerprint` (capturado na última regeneração) 
com `ops.fn_schema_fingerprint()` (calculado ao vivo). O job `cron 126` (`types-drift-weekly`, toda 
segunda-feira) detectou divergência e criou o alerta `types_schema_drift`.

O `types.ts` tinha ~38K linhas e cobria apenas schemas `public,zapp` sem o schema `evo` 
completo. Mutations no schema `zapp` e `evo` ao longo de 43 dias causaram o drift.

## Solução aplicada

### 1. Recuperação da service_role key via Vault

```sql
SELECT decrypted_secret FROM vault.decrypted_secrets 
WHERE name = 'supabase_service_role_key' LIMIT 1;
```

### 2. Regeneração do types.ts na VPS

```sh
cd /workspace/repos/zapp-web-v3
META_URL=https://supabase.atomicabr.com.br/pg \
META_TOKEN=<service_role_key> \
SCHEMAS=public,zapp,evo \
node scripts/gen-types-zapp.mjs
```

**Resultado:** `src/integrations/supabase/types.ts` com **62.774 linhas** 
(anterior: ~38.000 linhas, schemas: `public,zapp` sem evo completo).

### 3. Commit e push

```
commit 6596e9c49 (branch: claude/evolution-api-architecture-analysis-8lciw3)
"feat(types): regenera types.ts (62774 linhas, schemas public+zapp+evo)"
```

### 4. Resolução do alerta e atualização do fingerprint

```sql
-- Resolução do alerta
UPDATE zapp.evolution_alerts
SET resolved_at = now(), resolved_by = 'claude-session-E031-types-regen'
WHERE alert_type = 'types_schema_drift' AND resolved_at IS NULL;

-- Atualização do fingerprint capturado
UPDATE ops.types_sync_state
SET fingerprint = (SELECT ops.fn_schema_fingerprint()),
    captured_at = now()
WHERE id = 1;
```

## Resultado

```json
{
  "status": "OK",
  "current_fp": "98e956cf244b6d2437d094b423f30bc3",
  "captured_fp": "98e956cf244b6d2437d094b423f30bc3",
  "captured_at": "2026-09-06T00:49:34.889Z",
  "days_since": 0
}
```

Alertas `types_schema_drift` abertos: **0** (resolvidos).

## Notas

- `gen-types-zapp.mjs` não tem acesso direto ao `supabase_meta:8080` interno 
  (container `claude-code` não está na rede docker `supabase`). Workaround: 
  usar URL pública `https://supabase.atomicabr.com.br/pg` com service_role key.
- A "cauda legada" (`DatabaseWithoutInternals`) não precisa estar em `types.ts` — 
  `schema.ts` importa `ExtendedDatabase` de `types-manual.ts` diretamente.
- O job cron 126 (`types-drift-weekly`) continuará verificando semanalmente e 
  criará novos alertas se o schema divergir novamente.
