# E001.7 — Alertas Abertos (baseline 2026-09-06)

**Capturado em:** 2026-09-06T00:35:00Z

## Resumo

| Tipo | Total | Último | Ação necessária |
|------|-------|--------|-----------------|
| `wal_slot_absent` | 72 | 2026-09-06T00:00 | ⚠️ PORTAINER: restart supabase_analytics ou aumentar memory de 1GB→2GB |
| `license_heartbeat` | 59 | 2026-09-05T23:00 | Investigar — possível Evolution API key expirada |
| `fdw_ingest_deficit` | 7 | 2026-09-04T20:37 | Verificar FDW e replicação PG14→PG15 |
| `ddl_drop_alert` | 3 | 2026-09-06T00:16 | ✅ RESOLVIDOS — todos legítimos (purge partição, probe MCP, rollback contaminação) |
| `socket_flapping` | 1 | 2026-09-06T00:25 | ⚠️ Monitorar — wpp2 em reconexão, agora open/isHealthy |
| `recon_coverage` | 1 | 2026-09-04T04:30 | Verificar coverage de reconciliação |
| `decouple_preflight_fail` | 1 | 2026-08-26T01:05 | Verificar guard de decouple |
| `types_schema_drift` | 1 | 2026-08-24T13:29 | Drift entre TypeScript types e schema real |
| `evo_guardian_weekly` | 1 | 2026-08-31T06:30 | Guardian semanal sem ação |
| `evo_guardian_monthly` | 1 | 2026-09-01T07:00 | Guardian mensal sem ação |
| `ddl_weekly_summary` | 1 | 2026-08-31T08:59 | Summary DDL semanal |

## Crítico: wal_slot_absent (analytics OOM)

**Causa raiz identificada:** Container `supabase_analytics` crashando por OOM com memory limit de 1GB.
**Slot ausente:** `cainophile%` (usado para analytics do Supabase).
**Risco:** WAL não consumido → acúmulo no disco a longo prazo.
**Solução:** Via Portainer — aumentar memory limit do serviço `supabase_analytics` de 1GB para 2GB, ou restart.
**Portainer indisponível** nesta sessão (sessão expirada).

## Ações desta sessão

- ✅ `ddl_drop_alert` × 3 resolvidos (resolved_at = now())
- ✅ Watchdogs 104 e 120 reativados (active=false → true)
