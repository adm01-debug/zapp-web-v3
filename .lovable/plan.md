

## Hook realtime: sincronização de `evolution_contacts` com a lista de conversas

### Contexto

Hoje a lista de conversas (inbox) é alimentada por `rpc_list_conversations` + dados de contato vindos de `rpc_list_contacts`/`rpc_get_contact`. Updates em `evolution_contacts` (mudança de `lead_status`, `push_name`, `profile_picture_url`, `assigned_to`, `notes`, novas tags) **não chegam ao cliente em tempo real** — só após refetch manual ou navegação. Já temos `useRealtimeMessages` para mensagens; falta o equivalente para contatos.

### Decisão

Criar `useRealtimeContacts` no padrão dos hooks realtime existentes (`useRealtimeMessages`, `useMessageUpdateBatcher`):

- Subscreve `postgres_changes` no schema `public`, tabela `evolution_contacts`, eventos `INSERT | UPDATE | DELETE`, no **`externalClient`** (FATOR X).
- Filtro: `instance_name=eq.wpp2` (padrão do projeto).
- Aplica updates batched (100ms) no cache do React Query das queries de conversa/contato — sem refetch desnecessário.
- Trata soft delete (`deleted_at IS NOT NULL`) removendo o item da lista.

### Arquivos

**Criados (2):**

1. `src/hooks/realtime/useRealtimeContacts.ts` — hook principal
   - Assinatura: `useRealtimeContacts({ instance?: string; enabled?: boolean })`
   - Subscreve canal único `realtime:evolution_contacts:wpp2` no `externalClient`.
   - Mantém `pendingUpdatesRef: Map<remote_jid, EvolutionContact>` + `flushTimerRef` (100ms).
   - Em flush: invalida/atualiza queries `['conversations', instance, ...]`, `['contact', remoteJid]`, `['contacts-list', ...]` via `queryClient.setQueryData` (patch otimista) com fallback a `invalidateQueries` quando não há entrada em cache.
   - INSERT → invalida lista (novo contato pode aparecer).
   - UPDATE → patch direto + emite evento `window.dispatchEvent(new CustomEvent('contact-updated', { detail }))` para componentes não-React-Query.
   - DELETE/`deleted_at` → remove do cache de lista, mantém no cache individual (para UI mostrar "contato removido").
   - Cleanup: `externalClient.removeChannel` + `clearTimeout`.

2. `src/hooks/realtime/__tests__/useRealtimeContacts.test.ts` — testes vitest
   - Mock `externalClient` (channel/on/subscribe/removeChannel).
   - Casos: subscreve no mount; ignora payload de outra instance; UPDATE atualiza cache; DELETE remove da lista; flush respeita debounce de 100ms; cleanup remove canal.

**Editados (2):**

3. `src/components/inbox/InboxView.tsx` (ou container raiz da inbox — confirmo no momento da implementação procurando o consumidor de `rpc_list_conversations`):
   - Chama `useRealtimeContacts({ instance: 'wpp2' })` uma única vez no topo.

4. `mem://architecture/performance` (atualização incremental):
   - Adicionar linha mencionando `useRealtimeContacts` ao lado de `useRealtimeMessages` no padrão de batchers 100ms.

### Detalhes técnicos relevantes

- **Cliente correto**: `externalClient` (FATOR X), não `supabase`. Garante que o realtime escuta o banco onde a tabela vive.
- **Sem bypass de RPC**: o hook só *escuta* mudanças e atualiza cache; leituras continuam via `rpc_list_contacts`/`rpc_get_contact`. Não viola a regra de "nunca SELECT direto em `evolution_contacts`".
- **Filtro de instância** aplicado no servidor (`filter: 'instance_name=eq.wpp2'`) para reduzir tráfego.
- **Idempotência de cache**: `setQueryData` usa `produce`-like update — se contato não existir na lista atual, fallback para `invalidateQueries` em vez de inserir blindly (preserva ordenação/paginação do RPC).
- **Defesa contra broadcast**: filtra `remote_jid` que case com `/^status@broadcast$|@broadcast$/` antes de propagar (memória `inbox/broadcast-defense`).
- **Tipos**: usar `EvolutionContact` de `src/types/evolutionExternal.ts` no payload tipado.
- **Logger**: `getLogger('RealtimeContacts')` para warn em payloads malformados.

### Fora de escopo

- Não toca em `rpc_*` nem em policies do FATOR X.
- Não cria nova tabela ou migração.
- Não altera `useRealtimeMessages`.
- Sem painel de status do canal (pode vir num lote futuro junto ao monitoring de webhook).

