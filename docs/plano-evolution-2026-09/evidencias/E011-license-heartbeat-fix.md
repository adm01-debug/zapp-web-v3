# E011 — Fix license_heartbeat: pg_net → DB check

**Data:** 2026-09-06T00:36:00Z  
**Executado por:** Claude Code (session_01L31oCwaoHggWFgGE8u4vAS)

## Diagnóstico

| Campo | Valor |
|-------|-------|
| Alert type | `license_heartbeat` |
| Alertas abertos | 59 |
| Total de falhas no log | 513 |
| Primeira falha | 2026-08-12T09:48:29Z |
| Última falha (antes do fix) | 2026-09-06T00:00:00Z |
| Padrão | `http_code=0`, `raw=''`, `status='sem_resposta'` |

## Causa raiz

`fn_check_license_heartbeat()` (cron job 493, `onda2_license_monitor`, horário) usava
`net.http_get('http://evolution_evolution:8080/license/status', timeout=5000ms)` seguido
de `pg_sleep(7)`. 

Desde a extração do Evolution API para stack separado em **2026-08-12**, a rede Docker
`evolution_evolution` não é acessível a partir do contexto pg_net no container Supabase.
O request é enfileirado mas nunca retorna dentro dos 7s → SELECT de `net._http_response`
retorna NULL → `v_code=0`, `v_body=''` → `status='sem_resposta'`.

**pg_net está funcional** (verificado: responses 200 para outras URLs às 00:35).
O problema é exclusivamente de roteamento Docker para `evolution_evolution:8080`.

## Solução aplicada

Substituição do check HTTP por check DB direto em `zapp.whatsapp_connections`:
- Se `count(status='connected' AND is_active=true) > 0` → `'active'`
- Sem dependência de rede Docker
- Mais confiável: `whatsapp_connections` é atualizada pelo watchdog

## Resultado

```
SELECT zapp.fn_check_license_heartbeat();
-- → 'active'

-- log entry gerada:
-- checked_at: 2026-09-06T00:36:52Z
-- status: 'active'
-- http_code: 200
-- raw: 'db_check_s20v4: 1 instâncias connected/active'

-- alertas license_heartbeat abertos: 0 (resolvidos pelo UPDATE interno da função)
```

## Migration

`supabase/migrations/20260906003500_fix_license_heartbeat_fn_db_check_s20v4.sql`  
Registrada em `supabase_migrations.schema_migrations` (version=20260906003500).
