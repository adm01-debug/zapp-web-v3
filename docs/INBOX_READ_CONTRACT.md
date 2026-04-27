# 📜 Contrato de Leitura do Inbox — zapp-web

**Última atualização:** 2026-04-27
**Status:** Vinculante. Toda PR que violar este contrato será rejeitada.

## TL;DR

Toda leitura de mensagens no frontend do zapp-web é feita no **Supabase FATOR X**
(`tdprnylgyrogbbhgdoik`, schema `zapp`, tabela `evolution_messages`) via a edge
function `external-db-proxy`. **Não consultamos a Evolution API em tempo de leitura.**

## Por quê

| Fator | Evolution API | FATOR X (Postgres) |
|---|---|---|
| Latência típica de listagem | 1.000–3.000 ms | 50–150 ms |
| Busca textual em 30 dias | 5.000+ ms ou inviável | 80–200 ms (índice GIN) |
| Realtime de status | Inexistente em pull | Postgres Changes <100 ms |
| Paginação cursor (infinite scroll) | Frágil/ausente | Nativa keyset |
| RLS, RBAC, soft-delete, auditoria | Inexistente | 181 policies ativas |
| Disponibilidade independente do VPS Baileys | Não | Sim |

A Evolution API é um **gateway WhatsApp** (entrada via webhook + saída via envio),
não uma camada de leitura para UI realtime.

## Arquitetura vinculante

### LEITURA — único caminho permitido

```
ChatPanel
  → useRealtimeInbox
    → useExternalEvolution (useExternalConversations | useExternalMessages)
      → queryExternalProxy (src/lib/externalProxy.ts)
        → edge function `external-db-proxy`
          → SELECT em zapp.evolution_messages no FATOR X
```

### ESCRITA 1 — webhook (cliente → sistema)

```
Evolution API → POST /functions/v1/evolution-webhook
              → valida assinatura
              → INSERT em zapp.evolution_messages
              → triggers atualizam conversations.last_message + unread_count
              → broadcast Realtime (REPLICA IDENTITY FULL)
              → enqueue download-media (se tiver mídia)
              → enqueue ai-transcribe-audio (se tiver áudio)
```

### ESCRITA 2 — envio (atendente → cliente)

```
Frontend → externalMessageSender
         → invoke('evolution-api', { action: 'send-text', ... })
         → Evolution API → WhatsApp
                         ↓
              ACK volta pelo webhook → UPDATE evolution_messages.status
                                     → useMessageStatus reflete via Realtime
```

## Regras

1. **R1 — Leitura:** todo dado de mensagem renderizado no inbox vem de query
   Postgres em `zapp.evolution_messages`, sempre via `queryExternalProxy`.
2. **R2 — Escrita de saída:** disparada exclusivamente por `externalMessageSender`,
   que invoca a edge function `evolution-api`. É **legítimo** importar
   `useEvolutionApi` em componentes do inbox **exclusivamente** para ações de
   envio/edição (ex.: `editMessage`, `sendStickerMessage`, `sendPollMessage`,
   `sendContactMessage`, `sendStatusMessage`). Nunca para leitura.
3. **R3 — Escrita de entrada:** persistida exclusivamente pelo webhook
   `evolution-webhook`. Frontend nunca grava direto em `evolution_messages`.
4. **R4 — Status de mensagem:** o frontend observa via Postgres Changes, nunca
   via polling à Evolution API.
5. **R5 — Mídias:** o frontend acessa por URL no Storage (Lovable Cloud).
   Pipeline assíncrono `download-media` baixa da Evolution e atualiza o registro.
6. **R6 — Filtros aplicados pelo frontend:** `assigned_to`, `instance_name`,
   `deleted_at IS NULL`. Documentar todo novo filtro neste arquivo.

## O que está proibido

- ❌ Chamar `evolution-api` (action `find-messages`, `find-chats`,
  `list-messages`, etc.) com a finalidade de popular UI.
- ❌ Substituir `queryExternalProxy` por chamadas a outra edge function de leitura.
- ❌ Persistir mensagens recebidas em qualquer outra tabela que não seja
  `zapp.evolution_messages`.
- ❌ Importar utilitários de leitura da Evolution API
  (`**/evolution-api/**/find*`, `**/evolution-api/**/list-messages*`) em
  qualquer arquivo dentro de `src/components/inbox/**`, `src/hooks/inbox/**`
  ou `src/pages/Inbox*` — bloqueado por ESLint.

## Diagnóstico de problemas

Se o inbox aparecer vazio ou desatualizado, **investigar nesta ordem**:

1. **Webhook não está gravando** → ver `/admin/inbox-sync-status` (Card
   "Webhook Lag") e logs de `evolution-webhook`.
2. **RLS/RPC bloqueando leitura** → ver logs do `external-db-proxy`.
3. **Filtros do frontend** → conferir `assigned_to`, `instance_name` (ex: `wpp2`),
   `deleted_at`, range de datas.

## Página de saúde

`/admin/inbox-sync-status` (acesso `admin`/`supervisor`) consolida:

- Lag de última mensagem inbound/outbound contra `zapp.evolution_messages`.
- Contagens em janelas 5min / 1h / 24h.
- Top conversas por volume nas últimas 24h.
- Falhas recentes de envio (`public.failed_messages`).
- Auditoria recente (`public.audit_logs`).

Follow-ups planejados (não bloqueantes):
- Card "Realtime Subscriptions" (estado da subscription Postgres Changes).
- Card "Evolution API Reachability" (X/12 instâncias `connectionStatus=open`).
- RPC `rpc_canary_check` no FATOR X para sanity de RLS.
- View `v_webhook_health` agregada por instância.

## Como propor mudanças neste contrato

Mudanças exigem PR com tag `arch-change`, revisão do tech lead e aprovação do
Joaquim (CTO/produto). Atualizar a data no topo do arquivo e adicionar entrada
em `CHANGELOG.md`.
