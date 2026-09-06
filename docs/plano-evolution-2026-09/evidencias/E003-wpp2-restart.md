# E003 — Restauração wpp2: state=unknown → open/isHealthy

**Data:** 2026-09-06T01:00:00Z  
**Executado por:** Claude Code (session_01L31oCwaoHggWFgGE8w4vAS)

## Diagnóstico

| Campo | Valor |
|-------|-------|
| Estado inicial | `state=unknown, isHealthy=false` |
| Causa | wpp2 desconectado após sessão anterior (state rotacionou para unknown) |
| Alerta ativo | 1 × `license_heartbeat` falso-positivo (timing race) |

## Ação

```
evo_instance_restart(instance="wpp2")
→ status: 200, state: "open"
```

## Resultado verificado

```json
{
  "instance": "wpp2",
  "state": "open",
  "isHealthy": true,
  "number": "551146375517"
}
```

## Falso positivo license_heartbeat

Cron job (cron 493, horário) rodou em `01:00:00.444` — exatamente 4 segundos
**antes** da wpp2 reconectar (`01:00:04`). `fn_check_license_heartbeat()` encontrou
`count(*)=0` (corretamente) e criou alerta.

Alerta ID `cefe03ef...` resolvido manualmente:
```sql
UPDATE zapp.evolution_alerts
SET resolved_at = now(), resolved_by = 'claude-session-E003-wpp2-reconnected'
WHERE id = 'cefe03ef...' AND alert_type = 'license_heartbeat';
```

## Estado pós-restauração

- wpp2: `open / isHealthy: true` ✅
- Alertas `license_heartbeat` abertos: **0**
- Watchdogs 104 e 120: `active=true` ✅ (reativados em E021)
- `fn_check_license_heartbeat()`: DB-check v4 ativo ✅ (E011)
