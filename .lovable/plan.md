

## Paginação incremental para `evolution_messages` no external-db-proxy

### Problema

`fetchExternalMessages(500)` em `useExternalEvolution.ts` chama o proxy com `table=evolution_messages, limit=500, order=created_at desc` **sem filtros**. Em uma tabela com 41k+ linhas e crescendo, isso é o que causa o `statement timeout` que vimos. O patch anterior (`enabled` flag) só esconde o problema enquanto `USE_EXTERNAL_DB=false`.

### Estratégia

1. **Janela de tempo recente** para o sidebar (lista de conversas): só pegar mensagens dos últimos N dias.
2. **Paginação por cursor** (`created_at < lastSeen`) para histórico de mensagens dentro de uma conversa.
3. **Limite duro no proxy** para evitar abuso futuro.
4. **Whitelist de filtros** para `evolution_messages` (proxy força um filtro mínimo quando a tabela é essa).

---

### Mudanças

**1. `supabase/functions/external-db-proxy/index.ts`**

- Definir `HEAVY_TABLES = new Set(['evolution_messages', 'evolution_webhook_events'])`.
- Quando `table ∈ HEAVY_TABLES`, exigir pelo menos UM dos filtros: `remote_jid`, `conversation_id`, `instance_name`, ou um filtro de janela em `created_at` (`gte`/`gt`). Se nada disso estiver presente E `limit > 100`, **rejeitar com 400** com mensagem `"Heavy table requires filter (remote_jid/conversation_id/instance_name) or created_at window"`.
- Cap absoluto de `limit`: `Math.min(limit ?? 50, 200)` para tabelas pesadas; `500` para o resto.
- Adicionar log estruturado curto (`console.log(JSON.stringify({ fn:'proxy', table, limitEffective, hasFilter, ms }))`) para diagnosticar o próximo timeout.

**2. `src/hooks/useExternalEvolution.ts`**

- `fetchExternalMessages` (usado pela lista de conversas): trocar por `fetchRecentMessagesWindow(daysBack = 7, limit = 200)`:
  ```ts
  const since = new Date(Date.now() - daysBack * 86400_000).toISOString();
  return queryExternalProxy({
    table: 'evolution_messages',
    select: 'id,message_id,remote_jid,from_me,content,message_type,created_at,push_name,instance_name,direction,status',
    filters: [
      { column: 'instance_name', operator: 'eq', value: 'wpp2' },
      { column: 'created_at', operator: 'gte', value: since },
    ],
    order: { column: 'created_at', ascending: false },
    limit,
  });
  ```
  - `select` enxuto (sem `payload`/`raw_data`) reduz payload em ~80%.
  - `useExternalConversations` passa a chamar essa versão.

- `fetchMessagesByJid`: já tem filtro por `remote_jid`, mas:
  - Adicionar `instance_name=wpp2` no filtro (usa índice composto).
  - Trocar `limit=1000` por `limit=100` + cursor opcional `beforeDate`.
  - Adicionar `select` enxuto (sem `payload`/`raw_data` por padrão; um segundo fetch sob demanda traz payload se precisar).

**3. `useExternalMessages` (mesmo arquivo)**

- Aceitar `pageSize = 100` e expor `loadOlder()`:
  ```ts
  const loadOlder = useCallback(async () => {
    if (!remoteJid || messages.length === 0) return;
    const oldest = messages[0].created_at;
    const more = await fetchMessagesByJid(remoteJid, pageSize, oldest);
    if (more.length) setMessages(prev => [...more.map(evolutionToRealtimeMessage), ...prev]);
  }, [remoteJid, messages]);
  ```
- Polling de 5s passa a buscar só `created_at > lastSeen` (cursor para frente):
  ```ts
  filters: [{ column: 'remote_jid', operator: 'eq', value: jid },
            { column: 'created_at', operator: 'gt', value: lastSeenIso }]
  ```
  Faz merge sem reler tudo. Reduz de "1000 linhas/5s/conversa" para "0–N novas/5s/conversa".

**4. Tipos / contrato**

- `ProxySelectParams` em `src/lib/externalProxy.ts` ganha `cursor?: { column, operator: 'gt'|'lt'|'gte'|'lte', value: string }` opcional (sintaxe açucarada para empurrar nos filtros). Opcional — pode ficar pra depois se preferir manter `filters` puro.

### Comportamento esperado depois

| Cenário | Antes | Depois |
|---|---|---|
| Abrir Inbox (sidebar) | 500 msgs sem filtro → timeout | ~200 msgs últimos 7d com `instance_name=wpp2` |
| Abrir conversa | 1000 msgs por jid | 100 msgs por jid |
| Polling 5s | re-fetch full | só `created_at > lastSeen` |
| Scroll up no chat | nada | `loadOlder()` traz mais 100 |
| Query sem filtro em tabela pesada | passa | 400 com mensagem clara |

### Arquivos editados

- `supabase/functions/external-db-proxy/index.ts`
- `src/hooks/useExternalEvolution.ts`
- `src/lib/externalProxy.ts` (tipos)

### Fora de escopo

- Não muda RPCs FATOR X (`rpc_list_messages` já é o caminho preferido — esse hook é fallback).
- Não cria índice novo (já existe `(remote_jid, created_at desc)` segundo project-knowledge).
- Sem alteração no realtime / messageSender.

