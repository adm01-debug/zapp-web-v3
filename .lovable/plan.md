# Análise executiva — diagnóstico real

## O que você reportou vs. o que está acontecendo

Você enviou a doc do **Evo CRM Community** (docs.evolutionfoundation.com.br/self-hosted) — essa é uma plataforma Docker concorrente que **não tem nada a ver** com a Evolution API que o ZAPP usa. A Evolution API real é documentada em `doc.evolution-api.com/v2`.

Mais importante: **a Evolution API NÃO é a causa do "sistema quebrado"**. A análise dos logs prova isso:

```text
Console (frontend):
  errorName: FunctionsFetchError
  errorMessage: "Failed to send a request to the Edge Function"
  status: undefined          ← request nunca chegou ao servidor
  attemptDurationMs: 158-248 ← cancelada antes do round-trip

Edge logs (last 60s, external-db-proxy):
  OPTIONS 200, OPTIONS 200, OPTIONS 200, OPTIONS 200... (40+)
  POST                                                   ← ZERO
  Boots: 30+ em sequência (cold start em loop)
```

O preflight CORS (OPTIONS) responde 200, mas o POST que vem depois **nunca chega**. Isso é o sintoma clássico de:
1. A request é cancelada pelo browser/AbortSignal antes de sair
2. O Supabase Functions SDK falha no `invoke()` por sobrecarga/cold-start em paralelo
3. React Strict Mode + dezenas de hooks `useExternalEvolution` dispararam todas ao mesmo tempo no `/inbox`

Essa é a falha que faz o inbox aparecer "quebrado", o badge de atendimento ficar vazio e o `connection-health-check` parecer fora.

---

# Plano em duas ondas

## ONDA 1 — Estabilizar `external-db-proxy` (urgente, ~30min)

Foco: parar a chuva de POSTs cancelados que está derrubando o inbox.

### 1.1 Coalescência + dedupe no cliente
- `src/lib/externalProxy.ts` — adicionar **request coalescing**: se duas chamadas idênticas (mesma table+filters+limit) chegarem em uma janela de 250ms, retornar a mesma `Promise` (em vez de disparar dois POSTs paralelos).
- Adicionar **circuit breaker leve**: depois de 3 `FunctionsFetchError` consecutivos no mesmo target, abrir por 5s e responder cache (se houver) em vez de bombardear a edge.

### 1.2 Singleflight no inbox
- `src/hooks/useExternalEvolution.ts` — `fetchRecentMessagesWindow` é chamado por sidebar + crossTabDedupe + queryFn ao mesmo tempo. Garantir um único in-flight via `useRef<Promise>`.
- Aumentar `staleTime` do React Query do sidebar de "imediato" para 3s (já temos `POLL_INTERVAL = 5000`, então 3s de stale não muda UX mas mata 70% dos refetches duplicados).

### 1.3 AbortSignal + tratamento `FunctionsFetchError`
- No `queryExternalProxy`, distinguir **AbortError** (caller cancelou — silenciar) de **FunctionsFetchError sem status** (sobrecarga — retry com jitter maior).
- O retry atual usa backoff fixo curto que piora o problema; mudar para jitter exponencial `200ms × 2^attempt + random(100ms)`.

### 1.4 Healthcheck + sentinel da edge
- `supabase/functions/external-db-proxy/index.ts` — adicionar fast-path `GET /?ping=1` que responde `{ok:true}` em <10ms sem tocar Postgres. Isso dá ao painel admin um sinal vital separado das queries reais.
- Surfacing no painel: se o sentinel responder mas as queries falharem → problema é Postgres/RLS; se nem o sentinel responder → edge runtime está fritando.

### 1.5 Telemetria de "ghost POSTs"
- Logar no `clientTelemetry` quando `OPTIONS retorna 200 mas POST nunca foi enviado` (detectado pela ausência de `status` no error). Métrica nova: `proxy_ghost_post_rate`.

### Critério de aceite Onda 1
- 0 `FunctionsFetchError` em 5min de uso normal do inbox
- `/inbox` carrega lista de conversas em <2s
- Painel admin → Saúde mostra `external-db-proxy: ok` com sentinel verde

---

## ONDA 2 — Auditoria Evolution API v2 (depois da estabilização, ~1h)

Fonte de verdade: `doc.evolution-api.com/v2/api-reference/*` (oficial v2).

### 2.1 Inventário do que `evolution-api` chama hoje
Mapear cada `action` da edge function `supabase/functions/evolution-api/index.ts` para o endpoint v2 oficial e marcar:
- ✅ Match exato com doc
- ⚠️ Match parcial (body diferente, ou usa endpoint legacy)
- ❌ Endpoint inexistente / removido na v2

Áreas suspeitas (já listadas em `mem://integrations/evolution-api`):
- `fetchInstances` / `connectionState` — usado pelo `connection-health-check` (Layer 1+2). Verificar se v2 ainda retorna `owner` no payload.
- `sendText`, `sendMedia`, `sendAudio` — confirmar shape do `quoted` e `mentionsEveryOne`.
- `fetchProfilePictureUrl` — endpoint mudou de `/chat/fetchProfilePictureUrl/{instance}` para `/chat/fetchProfile/...` em algumas builds.
- `setPresence` (composing/recording) — confirmar payload `{ presence, delay }`.
- `markMessageAsRead` — payload deve ser array `read_messages`.

### 2.2 Normalizar erros + códigos de status
Doc v2 padronizou códigos: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Instance Not Found`, `500 Internal`. Atualizar `_shared/evolution-api-proxy.ts` para mapear cada um para uma `error_code` legível (`evolution_instance_not_found`, etc.) e propagar para o frontend.

### 2.3 Webhooks v2
- Conferir lista de eventos suportados em `doc.evolution-api.com/v2/api-reference/webhook` contra os 28 que `evolution-webhook` processa.
- Garantir que `MESSAGES_UPSERT`, `MESSAGES_UPDATE`, `CONNECTION_UPDATE`, `QRCODE_UPDATED` usam o shape v2 (não o v1.7 legado).

### 2.4 Fallbacks já registrados
Já existe `_shared/evolution-fallback-telemetry.ts` (mem `fallback-telemetry.md`) — só revisar se as decisões de fallback continuam fazendo sentido com a v2.

### Critério de aceite Onda 2
- Tabela de auditoria publicada em `mem://integrations/evolution-api/v2-audit.md`
- Toda chamada com ❌ corrigida ou explicitamente marcada como "v1 fallback intencional"
- Testes em `supabase/functions/evolution-api/*.test.ts` cobrindo as ações corrigidas

---

# Riscos / Não-objetivos

- **Não vou migrar para Evo CRM self-hosted** (Docker) — seria uma reescrita completa de semanas, descartando o frontend atual. Descartado pela sua escolha.
- **Não vou tocar no FATOR X** (banco externo). RPCs continuam exatamente como estão.
- Se Onda 1 não resolver os `FunctionsFetchError`, isso indicaria que o problema é compute do Lovable Cloud (cold start da edge runtime) — nesse caso a única ação restante é upgrade da instância do Cloud (Backend → Advanced → Upgrade instance), que comunico no fim da Onda 1 se necessário.

---

# Detalhes técnicos

```text
Arquivos editados na Onda 1:
- src/lib/externalProxy.ts                       (coalesce + circuit + jitter)
- src/hooks/useExternalEvolution.ts              (singleflight + staleTime)
- src/lib/clientTelemetry.ts                     (métrica ghost_post)
- supabase/functions/external-db-proxy/index.ts  (sentinel /ping)
- src/components/admin/operations/HealthPanel.tsx (sinal sentinel)
- src/lib/__tests__/externalProxy.coalesce.test.ts (novo)

Arquivos auditados/editados na Onda 2:
- supabase/functions/evolution-api/index.ts
- supabase/functions/_shared/evolution-api-proxy.ts
- supabase/functions/_shared/evolution-response-normalizers.ts
- supabase/functions/evolution-webhook/index.ts
- mem://integrations/evolution-api/v2-audit.md (novo)
```

Ao aprovar, executo Onda 1 imediatamente; ao terminar e validar zero `FunctionsFetchError`, sigo direto para Onda 2.