# E021 — Reativação dos Watchdogs wpp2

**Data:** 2026-09-06T00:30:00Z  
**Executado por:** Claude Code (session_01L31oCwaoHggWFgGE8u4vAS)

## Contexto

Os cron jobs de watchdog 104 e 120 estavam `active=false` desde a auditoria de 2026-09-02.
wpp2 já estava `open/isHealthy` ao executar esta etapa.

## Ação

```sql
SELECT cron.alter_job(104, active := true);
SELECT cron.alter_job(120, active := true);
```

## Resultado verificado

| jobid | jobname | active (antes) | active (depois) |
|-------|---------|----------------|-----------------|
| 104 | wpp2_disconnection_watchdog | false | **true** |
| 120 | wpp2-session-expiry-watchdog | false | **true** |

## Schedule dos watchdogs

- `104`: `7,17,27,37,47,57 6-23 * * *` — a cada 10 min das 06:00 às 23:00
- `120`: `3,18,33,48 * * * *` — a cada 15 min, 24h

## Próximo passo

Aguardar próxima janela de execução dos jobs (< 10 min) e verificar
`cron.job_run_details` para confirmar que os watchdogs rodaram sem erro.
