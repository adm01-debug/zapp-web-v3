

## Infinite scroll no chat (carregar mensagens antigas ao chegar no topo)

### Estado atual

- `useExternalMessages` já expõe `loadOlder()`, `loadingOlder`, `hasMore` (cursor `created_at < oldest`).
- `useMessages` (local DB) **não** expõe paginação — hoje retorna tudo via realtime/range loop.
- `useRealtimeInbox` consome um dos dois conforme `USE_EXTERNAL_DB`, mas **descarta** `loadOlder/loadingOlder/hasMore`.
- `ChatMessagesArea` é a área scrollável (`scrollContainerRef`), mas só implementa `scrollToBottom` / `scrollToMessage`. Sem listener de scroll-up.

### Mudanças

**1. `src/hooks/useRealtimeInbox.ts`** — propagar paginação
- Quando `USE_EXTERNAL_DB`, repassar `externalMsgs.loadOlder`, `externalMsgs.loadingOlder`, `externalMsgs.hasMore`.
- Quando local, expor stubs: `loadOlder = async () => {}`, `loadingOlder = false`, `hasMore = false` (no-op — local já carrega tudo).
- Adicionar ao retorno: `loadOlderMessages`, `loadingOlderMessages`, `hasMoreMessages`.

**2. `src/pages/Inbox.tsx` (ou wrapper que monta `ChatPanel`)** — passar props pra baixo
- Localizar onde `ChatPanel` é instanciado a partir de `useRealtimeInbox` e passar as 3 novas props.

**3. `src/components/inbox/ChatPanel.tsx`** — receber e passar
- Adicionar 3 props opcionais na interface `ChatPanelProps`: `onLoadOlder?: () => void | Promise<void>`, `loadingOlder?: boolean`, `hasMoreOlder?: boolean`.
- Repassar para `ChatMessagesArea`.

**4. `src/components/inbox/chat/ChatMessagesArea.tsx`** — detector + indicador
- Adicionar as 3 props na interface.
- `useEffect` no `scrollContainerRef` com listener `scroll`:
  - Threshold: `scrollTop < 80` E `hasMoreOlder` E `!loadingOlder` E `!isFetchingRef.current` → chamar `onLoadOlder()`.
  - **Preservar posição**: antes de chamar, capturar `prevScrollHeight = container.scrollHeight`; após `onLoadOlder` resolver e o DOM atualizar (via `requestAnimationFrame`), ajustar `container.scrollTop = container.scrollHeight - prevScrollHeight`. Sem isso o usuário "salta" pra baixo de novo.
  - Guardar `isFetchingRef` para evitar disparo duplo durante a animação.
- Indicador de loading no topo (acima do primeiro grupo de data): se `loadingOlder` → spinner pequeno + "Carregando mensagens anteriores…"; se `!hasMoreOlder && messages.length > 0` → texto sutil "Início da conversa".
- **Não** auto-scroll-to-bottom quando `loadingOlder` (já tratado pelo guard de preservação de posição).

### Detalhes técnicos

- Usar `useRef<boolean>` para `isFetchingRef` em vez de state pra evitar re-render no scroll handler.
- O `useEffect` de auto-scroll existente (`scrollToBottom` em mudança de `messages.length`) precisa ser ignorado quando a mudança veio de `loadOlder`. Solução: comparar `messages[0].id` antes/depois — se o primeiro id mudou, foi prepend → não scrollar pro fim.
  - Implementação: `prevFirstIdRef.current`. Se mudou e o length aumentou → prepend, skip auto-scroll.
- Throttle nativo: o listener é leve (3 comparações), não precisa de debounce, mas `passive: true` na adição.
- `loadOlder` no `useExternalEvolution` já tem guard `loadingOlder || !hasMore` — segurança extra.

### Comportamento

| Ação | Antes | Depois |
|---|---|---|
| Scroll até o topo do chat | Nada | Carrega 100 msgs anteriores, posição mantida |
| Não há mais mensagens | — | Mostra "Início da conversa" |
| Durante carregamento | — | Spinner discreto no topo |
| Modo local DB | — | No-op (já carrega tudo via range loop) |

### Arquivos editados

- `src/hooks/useRealtimeInbox.ts`
- `src/components/inbox/ChatPanel.tsx`
- `src/components/inbox/chat/ChatMessagesArea.tsx`
- `src/pages/Inbox.tsx` (ou onde `ChatPanel` é instanciado a partir do hook — confirmo na implementação)

### Fora de escopo

- Não toco em `useMessages` local (sem paginação por ora — local carrega tudo via range loop existente).
- Não mudo `useExternalEvolution.ts` (já tem `loadOlder` pronto).
- Sem virtualização nova — a lista atual usa render direto; com 100 msgs por página é OK.

