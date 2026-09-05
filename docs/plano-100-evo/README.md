# Plano 100 — Auditoria do schema `evo` (cópia espelho)

Documento canônico: `adm01-debug/evolution-stack/docs/PLANO_100_AUDITORIA_SCHEMA_EVO_2026-09-05.md`
(o `evo` é propriedade do evolution-stack — ADR-015). Esta cópia existe porque ~40 das 100 etapas
tocam este repo (edge `evolution-webhook`, `_shared/providers/evolution`, migrations espelho,
hooks Realtime, `CLAUDE.md`, `types.ts`).

## Etapas que tocam o zapp-web-v3

| Etapas | O quê |
|---|---|
| 15–21, 28–29, 82 | `supabase/functions/evolution-webhook` + `_shared`: outbound texto/mídia não espelhado, HTTP 200 silencioso em erro de handler, mídia síncrona antes do INSERT, timeouts, `messages.set`, remover `setupWebhook` |
| 19, 23, 35–56, 57–71 | migrations espelho (workaround do self-hosted: DDL via `supabase_db_query` + INSERT em `supabase_migrations.schema_migrations`) |
| 33 | REPLICA IDENTITY DEFAULT — validar hooks `useZappMessages`, `useZappConversations`, `useRealtimeContacts`, `useTranscriptionNotifications` |
| 41–42, 51 | índices do inbox/chat e policies de INSERT `authenticated` — validar contra `src/hooks` |
| 89, 91, 92 | `CLAUDE.md` (seção Banco de Dados está desatualizada: 76 tabelas em evo, 2 partições de messages, `evolution_media` em zapp), `docs/SCHEMA_REFERENCE.md`, `types.ts` |

Mudanças em `supabase/functions/**` disparam `edge-deploy.yml` no merge em `main`.
