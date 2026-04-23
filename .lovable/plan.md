

## Cancelar/prevenir loadOlder duplicado em scroll rápido

### Problema

`triggerLoad()` em `ChatMessagesArea.tsx` já tem `isFetchingOlderRef` como guard, mas:
1. Se o usuário **desce** durante o fetch, o batch que está chegando ainda é prepended e a posição é "ancorada" pra cima — o usuário sente um pulo pra trás indesejado.
2. Se o fetch demora e o usuário sobe→desce→sobe, ao soltar o ref (100ms após `finally`), um segundo `triggerLoad` dispara mesmo que o usuário já não esteja mais perto do topo.
3. Não há `AbortController` — o fetch HTTP continua mesmo após o usuário desistir.

### Mudanças

**1. `src/hooks/useExternalEvolution.ts`** — `loadOlder` aceita `AbortSignal`
- Adicionar `signal?: AbortSignal` em `fetchMessagesByJid` e propagar para `queryExternalProxy` (que já usa `fetch` internamente).
- `loadOlder` no `useExternalMessages`: criar `AbortController` interno, guardar em `loadOlderAbortRef`. Antes de iniciar novo, abortar o anterior se existir. No `catch`, ignorar `AbortError`.
- Expor `cancelLoadOlder()` no retorno do hook (chama `abort()` + reseta `loadingOlder`).

**2. `src/lib/externalProxy.ts`** — propagar `signal`
- `ProxySelectParams` ganha `signal?: AbortSignal`.
- `queryExternalProxy` passa `signal` para o `fetch` interno.

**3. `src/hooks/useRealtimeInbox.ts`** — expor `cancelLoadOlder`
- Quando external: repassar `externalMsgs.cancelLoadOlder`.
- Quando local: stub `() => {}`.

**4. `src/components/inbox/ChatPanel.tsx` + `RealtimeInboxView.tsx`** — propagar prop
- `onCancelLoadOlder?: () => void` → repassar para `ChatMessagesArea`.

**5. `src/components/inbox/chat/ChatMessagesArea.tsx`** — lógica de cancelamento
- Trackear direção do scroll: `lastScrollTopRef.current`. Se `scrollTop > lastScrollTop + 50` (descendo > 50px) E `isFetchingOlderRef.current === true` → chamar `onCancelLoadOlder()`.
- Cancelar também ao **desmontar** (cleanup do `useEffect`): `onCancelLoadOlder?.()` no return do effect.
- Manter `isFetchingOlderRef` mas adicionar `cancelledRef`: se cancelado durante o fetch, **pular o anchoring** de `scrollTop` no `requestAnimationFrame` (não força a posição pra cima — respeita onde o usuário está).
- Coalescing extra: throttle do `triggerLoad` via `lastTriggerAtRef` — não dispara se o último trigger foi há < 250ms (defesa contra micro-scrolls).

### Detalhes técnicos

- `AbortController` é nativo, não precisa de polyfill.
- `queryExternalProxy` já usa `fetch` — só passar `{ signal }` no init.
- `AbortError` precisa ser detectado por `error.name === 'AbortError'` (não `instanceof`) pra cobrir DOMException no Safari.
- O `setLoadingOlder(false)` deve rodar tanto no abort quanto no success — usar `finally` no `loadOlder`.
- Para o caso de prepend cancelado a meio caminho (rede já voltou): o `setMessages` no `then` precisa checar `if (controller.signal.aborted) return` antes de fazer merge.

### Comportamento esperado

| Cenário | Antes | Depois |
|---|---|---|
| Sobe rápido até topo, fica parado | 1 fetch | 1 fetch |
| Sobe → desce antes de terminar | Fetch completa, prepend força ancoragem pra trás | Fetch abortado, sem prepend, scroll mantido onde usuário está |
| Sobe rápido, dispara 3x | 1 fetch (guard ref) | 1 fetch (guard ref + 250ms throttle) |
| Troca de conversa durante loadOlder | Fetch órfão termina e suja state | Cleanup do effect aborta no unmount |

### Arquivos editados

- `src/lib/externalProxy.ts`
- `src/hooks/useExternalEvolution.ts`
- `src/hooks/useRealtimeInbox.ts`
- `src/components/inbox/ChatPanel.tsx`
- `src/components/inbox/RealtimeInboxView.tsx`
- `src/components/inbox/chat/ChatMessagesArea.tsx`

### Fora de escopo

- Não toco no polling forward (`pollNewMessages`) — já é incremental e leve.
- Sem mudança no proxy (Edge Function) — abort é client-side; o servidor termina sozinho.

