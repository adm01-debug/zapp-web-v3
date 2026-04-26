## Diagnóstico

A regressão veio do commit "Criou tela de permissões de rota". O `ProtectedRoute` passou a bloquear o render enquanto `useRouteRoles` busca o override no banco — isso muda o ciclo de montagem do `Index` (Chat). Combinado com o `useState` inicial recebendo `cache.get(path)` (que pode ser `undefined`) e o `useEffect` chamando `setRoles` mesmo quando o cache estava sincronizado, o componente re-renderiza em loop, propagando o erro pelos `setRef` do Radix nos filhos do `Index`.

## Correção

Tornar o `useRouteRoles` **não-bloqueante** e idempotente:

1. **`src/hooks/useRouteRoles.ts`**
   - Remover o estado `undefined` (loading). O hook passa a retornar `null` imediatamente enquanto o fetch ocorre.
   - Deduplicar requests concorrentes para o mesmo path via mapa `inflight`.
   - `setRoles` só dispara quando o valor realmente muda (`prev === cached ? prev : cached`), eliminando re-renders idênticos.
   - Quando o fetch resolve com override existente, ocorre uma única transição `null → AppRole[]`, sem loop.

2. **`src/components/auth/ProtectedRoute.tsx`**
   - Remover `overrideLoading` do `loading` agregado. Auth/roles ainda bloqueiam o render como antes; o override aplica assincronamente.
   - Lógica de `effectiveRoles` permanece: override `null` = usa `requiredRoles` do código; override array = substitui.

Resultado: o Chat (`/`) renderiza imediatamente após auth carregar, sem ciclo extra. Quando o override do banco chega para a rota atual, o `ProtectedRoute` reavalia uma única vez — se o usuário ainda tiver acesso, nada muda visualmente.

## Arquivos afetados

- `src/hooks/useRouteRoles.ts` (reescrita do hook)
- `src/components/auth/ProtectedRoute.tsx` (3 linhas)

Sem mudanças de banco. Sem mudança de API/componentes consumidores.
