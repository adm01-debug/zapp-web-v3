
## Objetivo

Implementar **carregamento incremental ao rolar para cima** no chat (infinite scroll reverso), usando cursor por `created_at` e `pageSize` fixo por conversa, com função `loadOlder()` exposta pelo hook e integrada ao `ChatMessagesArea`.

## Contexto

Hoje:
- `useMessages` (Lovable Cloud) faz **paginação loop até o fim** (`while hasMore`), carregando TUDO de uma conversa. Em conversas com 5k+ mensagens, isso é lento e consome memória.
- `scrollLoaderController.ts` já existe como controlador puro para "load older on scroll-to-top" — com throttle, in-flight lock e reverse-cancel. Está testado mas **não há produtor de dados conectado** (callbacks `onLoadOlder`/`hasMoreOlder` ficam stub).
- `ChatMessagesArea` já consome esse controller (presumido pelos testes), mas sem fonte real de páginas.
- Domínio FATOR X já tem RPC `rpc_list_messages(p_remote_jid, p_instance, p_limit, p_before_date)` com cursor nativo via `p_before_date`.

Lacuna: faltam (1) hook que pagina por cursor, (2) anchoring de scroll após prepend, (3) wiring em `ChatMessagesArea`.

## Mudança proposta

### 1. Novo hook: `src/hooks/useMessagesCursor.ts`

Substitui o loop atual em `useMessages` por paginação cursor-based, mantendo realtime.

```ts
interface UseMessagesCursorOptions {
  remoteJid: string | null;
  instanceName?: string;        // default 'wpp2'
  pageSize?: number;            // default 50
  enabled?: boolean;
}

interface UseMessagesCursorReturn {
  messages: Message[];               // ordenadas ASC (mais antigas primeiro)
  loading: boolean;                  // primeira página
  loadingOlder: boolean;             // páginas subsequentes
  hasMoreOlder: boolean;
  error: string | null;
  loadOlder: () => Promise<void>;
  cancelLoadOlder: () => void;       // aborta fetch in-flight
  refetch: () => Promise<void>;
  addMessage / updateMessage / removeMessage;  // realtime + optimistic
}
```

**Fluxo interno**:
- Estado: `pages: Message[][]`, `oldestCursor: string | null` (= `created_at` da mensagem mais antiga já carregada), `hasMoreOlder: boolean`.
- Primeira carga: `rpc_list_messages(p_remote_jid, p_instance, p_limit=pageSize, p_before_date=null)` → ordena DESC no DB, inverte para ASC no client → preenche `pages[0]`. Define `hasMoreOlder = data.length === pageSize`.
- `loadOlder()`: 
  - Guarda contra concorrência via `inFlightRef` + `AbortController`.
  - Chama `rpc_list_messages(..., p_before_date=oldestCursor)`.
  - Prepend: `setPages(p => [newer, ...p])`.
  - Atualiza `oldestCursor` para a nova mensagem mais antiga.
  - `hasMoreOlder = data.length === pageSize`.
- `cancelLoadOlder()`: aborta o controller atual; `loadingOlder` volta a `false` sem prepend.
- Realtime (INSERT/UPDATE/DELETE): aplicado na **última página** (`pages[pages.length - 1]`) — novas mensagens sempre entram no fim.
- Deduplicação por `id` no merge entre páginas e realtime.

### 2. Anchoring de scroll após prepend

`scrollLoaderController` já salva `savedScrollHeight` no momento do trigger. Em `ChatMessagesArea`, após o efeito que detecta novo conteúdo no topo:

```ts
useLayoutEffect(() => {
  const saved = controller.savedScrollHeight();
  if (saved !== null && containerRef.current) {
    const delta = containerRef.current.scrollHeight - saved;
    if (delta > 0) {
      containerRef.current.scrollTop = delta;
      controller.reset(); // ou método dedicado clearSavedHeight()
    }
  }
}, [messages.length]);
```

Adicionar método `clearSavedHeight()` ao controller para evitar `reset()` total (que zeraria throttle e lastScrollTop).

### 3. Wiring em `ChatMessagesArea` (componente que renderiza mensagens)

Substituir consumo de `useMessages` por `useMessagesCursor`. Conectar callbacks ao controller existente:

```ts
const { messages, loadingOlder, hasMoreOlder, loadOlder, cancelLoadOlder } = 
  useMessagesCursor({ remoteJid: contact.phone, pageSize: 50 });

const controller = useMemo(() => createScrollLoaderController({
  hasMoreOlder: () => hasMoreOlder,
  isLoadingOlder: () => loadingOlder,
  onLoadOlder: loadOlder,
  onCancelLoadOlder: cancelLoadOlder,
  getScrollHeight: () => containerRef.current?.scrollHeight ?? 0,
}), [hasMoreOlder, loadingOlder, loadOlder, cancelLoadOlder]);

const onScroll = (e) => controller.onScroll(e.target.scrollTop, /*preloadPx*/ 600);
```

Indicador visual no topo: `{loadingOlder && <LoadingSpinner className="py-2" />}`. Quando `!hasMoreOlder && messages.length > 0`, opcional badge "Início da conversa".

### 4. Integração com métricas existentes

`loadOlderMetrics.ts` já existe. Conectar:
- `recordLoadOlderStarted()` no início de `loadOlder`.
- `recordLoadOlderCompleted(startedAt, { pageSize, hasMore })` no sucesso.
- `recordLoadOlderCancelled(startedAt, { reason: 'user_scroll_down' })` quando `cancelLoadOlder` é chamado.

### 5. Migração de `useMessages` (não-quebrante)

Manter `useMessages` atual intacto. Outros consumidores (não-chat) que precisam de TODAS as mensagens continuam usando-o. Apenas `ChatMessagesArea` migra para `useMessagesCursor`. Isso evita riscos em telas como dashboards/exports.

### 6. Testes

`src/hooks/__tests__/useMessagesCursor.test.tsx`:
1. Primeira carga retorna pageSize mensagens + `hasMoreOlder=true` quando RPC retorna pageSize linhas.
2. `hasMoreOlder=false` quando RPC retorna < pageSize.
3. `loadOlder()` chama RPC com `p_before_date` = `created_at` da mais antiga.
4. Múltiplas chamadas concorrentes a `loadOlder()` resultam em 1 RPC call (in-flight lock).
5. `cancelLoadOlder()` aborta fetch e zera `loadingOlder`.
6. Realtime INSERT é aplicado no fim do array, mesmo após múltiplos `loadOlder()`.
7. Trocar `remoteJid` reseta `pages`, `oldestCursor` e dispara nova primeira carga.
8. Dedup: mensagem que já existe na página anterior não é duplicada na nova.

`src/components/inbox/chat/__tests__/scrollAnchor.test.ts` (novo, ou ampliar suite existente):
1. Após prepend com `savedScrollHeight=5000`, scroll é ajustado para `newHeight - 5000`.
2. `clearSavedHeight()` zera o anchor sem afetar throttle/lastScrollTop.

## Arquivos

| Ação | Arquivo |
|---|---|
| Criar | `src/hooks/useMessagesCursor.ts` |
| Editar | `src/components/inbox/chat/scrollLoaderController.ts` (adicionar `clearSavedHeight()`) |
| Editar | `src/components/inbox/chat/ChatMessagesArea.tsx` (consumir novo hook + anchoring) |
| Criar | `src/hooks/__tests__/useMessagesCursor.test.tsx` |
| Editar | `src/components/inbox/chat/__tests__/scrollLoaderController.test.ts` (cobrir `clearSavedHeight`) |

## Não-objetivos

- Não remover/depreciar `useMessages` — coexistência intencional.
- Não migrar dashboards/exports/relatórios para o novo hook.
- Não implementar "jump to date" (cursor para o futuro a partir de uma data) — escopo limitado a "load older".
- Não tocar em `useExternalEvolution` — esse já tem fluxo próprio de polling.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Mensagens com `created_at` idêntico podem ser puladas no cursor (RPC usa `<` em `before_date`) | Usar tie-breaker — incluir mensagens com `created_at == cursor AND id != cursorId` no merge client-side, dedup por `id`. |
| Realtime INSERT chega enquanto `loadOlder` está em vôo | Realtime sempre append no fim; loadOlder sempre prepend. Não há colisão. |
| Anchoring falha em scroll smooth/ios momentum | `useLayoutEffect` roda síncrono antes do paint; ajuste de `scrollTop` sobrescreve momentum. Aceitável. |
| Trocar de contato durante `loadOlder` em vôo | Hook tem `mountedRef` + abort no cleanup do effect de `remoteJid`. |
| Usuário com 50k mensagens scrolla até o topo (1000 paginações) | Aceitável — cada página é leve. Memória cresce linearmente; fora do escopo otimizar com windowing aqui (já existe `VirtualizedMessageList`). |
