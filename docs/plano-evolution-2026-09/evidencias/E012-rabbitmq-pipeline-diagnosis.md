# E012 — Diagnóstico Pipeline RabbitMQ: Publisher OK, Consumer parado

**Data:** 2026-09-06T01:10:00Z  
**Executado por:** Claude Code (session_01L31oCwaoHggWFgGE8u4vAS)

## Estado do pipeline

| Componente | Estado | Evidência |
|-----------|--------|-----------|
| wpp2 connection | ✅ `open/isHealthy` | `evo_instance_info` |
| RabbitMQ publisher (Postgres) | ✅ `enabled=true` | `evo_rabbitmq_find` |
| Eventos configurados | ✅ 17 eventos | ver lista abaixo |
| Consumer (stack 113) | ❌ parado/com bugs | `RMQ-EVENTS-NO-CONSUMER-DISABLED-20260903` |
| `webhook_events_15min` | ❌ `null` | `evolution_pipeline_health_log` |
| `pipeline_status` | ⚠️ `warning` | `evolution_pipeline_health_log` |

## Config RabbitMQ wpp2 (Postgres) — `evo_rabbitmq_find`

```json
{
  "id": "28d2d9a1-d100-4a65-856f-dc232e413eac",
  "enabled": true,
  "events": [
    "QRCODE_UPDATED",
    "MESSAGES_UPSERT",
    "MESSAGES_UPDATE",
    "MESSAGES_DELETE",
    "SEND_MESSAGE",
    "CONTACTS_UPSERT",
    "CONTACTS_UPDATE",
    "CHATS_UPSERT",
    "CHATS_UPDATE",
    "GROUPS_UPSERT",
    "GROUP_UPDATE",
    "GROUP_PARTICIPANTS_UPDATE",
    "CONNECTION_UPDATE",
    "LABELS_EDIT",
    "LABELS_ASSOCIATION",
    "CALL",
    "LOGOUT_INSTANCE"
  ],
  "updatedAt": "2026-09-03T16:12:53.771Z",
  "instanceId": "f7a73e2c-327d-426c-8fa6-6ea7743ace02"
}
```

## Causa raiz

O publisher Evolution API → RabbitMQ está **ativo e configurado corretamente**.
O gap de eventos (`webhook_events_15min=null`) é causado pelo **consumer (stack 113)**
estar parado desde 2026-09-03 (label de auditoria: `RMQ-EVENTS-NO-CONSUMER-DISABLED-20260903`).

**Fluxo esperado (A13):**
```
Evolution API → RabbitMQ → evolution-rabbit-consumer (stack 113) → POST → edge function
```

Stack 113 parado → eventos publicados no queue RabbitMQ mas não consumidos → acúmulo.

## PR #113 pendente (Evolution_Api_Stack)

4 bug fixes no `consumer.py` aguardando merge humano. Após merge:
1. GitOps redeploya stack 113 automaticamente
2. Consumer processa backlog do RabbitMQ
3. `webhook_events_15min` deve sair de `null` para valor positivo
4. `pipeline_status` volta para `ok`

## Próximos passos

1. **Merge PR #113** (Evolution_Api_Stack) — ação humana (Joaquim)
2. **Após merge**: verificar `evolution_pipeline_health_log` em 15 min
3. **E020**: criar watchdog `fn_consumer_stats_stale_alert()` para alertar se
   `webhook_events_15min` ficar `null` por >30 min com wpp2 conectada

## Bloqueadores

- Consumer (stack 113): parado, requer merge de PR + GitOps
- Portainer: sessão expirada (verificação manual de serviços indisponível)
