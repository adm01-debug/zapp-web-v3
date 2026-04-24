
## Objetivo

Reduzir o peso da listagem de mensagens carregando primeiro **versão "lite"** (sem `payload` / `raw_data` / `notes` / `tags` etc.) e buscando os campos pesados **sob demanda** quando a UI precisar (ex.: dialog "Detalhes do envio", debug, retry).

## Contexto

Hoje:
- `rpc_list_messages(p_remote_jid, p_instance, p_limit, p_before_date)` retorna `evolution_messages*` — incluindo `payload` (jsonb potencialmente grande, principalmente em mídia/template) e `raw_data` (webhook bruto, frequentemente >5KB).
- `useMessagesCursor` faz `pages` de 50 mensagens. Em conversa com mídia, isso traz centenas de KB desnecessários por página.
- Apenas dois lugares hoje precisam de payload/raw_data: `AdminFailedMessagesPage` (debug admin) e o futuro "abrir detalhes do envio" no chat.

Lacuna: não existe variante lite da RPC nem hook de hidratação on-demand.

## Mudança proposta

### 1. Migração SQL — duas novas RPCs no FATOR X

Criar via migration:

```sql
-- Versão leve: campos essenciais para render do chat
CREATE OR REPLACE FUNCTION public.rpc_list_messages_lite(
  p_remote_jid text,
  p_instance text DEFAULT 'wpp2',
  p_limit int DEFAULT 50,
  p_before_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  message_id text,
  remote_jid text,
  from_me boolean,
  direction text,
  status text,
  message_type text,
  content text,
  media_url text,
  media_mimetype text,
  media_type text,
  media_filename text,
  caption text,
  quoted_message_id text,
  is_starred boolean,
  is_important boolean,
  sent_by_bot boolean,
  push_name text,
  instance_name text,
  created_at timestamptz,
  status_at timestamptz,
  deleted_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, message_id, remote_jid, from_me, direction, status,
         message_type, content, media_url, media_mimetype, media_type,
         media_filename, caption, quoted_message_id, is_starred,
         is_important, sent_by_bot, push_name, instance_name,
         created_at, status_at, deleted_at
  FROM evolution_messages
  WHERE remote_jid = p_remote_jid
    AND instance_name = p_instance
    AND deleted_at IS NULL
    AND (p_before_date IS NULL OR created_at < p_before_date)
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- Detalhe completo de UMA mensagem (inclui payload, raw_data, notes, tags etc.)
CREATE OR REPLACE FUNCTION public.rpc_get_message_details(
  p_message_id uuid
)
RETURNS evolution_messages
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM evolution_messages WHERE id = p_message_id LIMIT 1;
$$;
```

Migration roda no projeto Lovable Cloud para manter histórico, mas as RPCs vivem no FATOR X (`tdprnylgyrogbbhgdoik`). Operador aplica via supabase migration tool apontando ao projeto externo OU coordenamos pedido (como está documentado em `mem://database/migration/external-fator-x-transition`). Atualizar `mem://database/migration/fator-x-schema-refactor` ao concluir.

### 2. Tipo `EvolutionMessageLite` — `src/types/evolutionExternal.ts`

```ts
export type EvolutionMessageLite = Pick<EvolutionMessage,
  | 'id' | 'message_id' | 'remote_jid' | 'from_me' | 'direction'
  | 'status' | 'message_type' | 'content' | 'media_url' | 'media_mimetype'
  | 'media_type' | 'media_filename' | 'caption' | 'quoted_message_id'
  | 'is_starred' | 'is_important' | 'sent_by_bot' | 'push_name'
  | 'instance_name' | 'created_at' | 'status_at' | 'deleted_at'
>;
```

`EvolutionMessage` continua existindo para detail view (mantém compat).

### 3. `useMessagesCursor` migra para `rpc_list_messages_lite`

Mudanças mínimas:
- Trocar nome da RPC.
- Trocar tipo do estado para `EvolutionMessageLite[][]`.
- Tipo de retorno do hook: `messages: EvolutionMessageLite[]`.
- Realtime continua chegando com payload completo — ao receber INSERT/UPDATE, **projetar** para Lite descartando campos pesados antes de armazenar (helper `toLite(m)`).

Resultado: payload de página cai ~70-90% em conversas com mídia/templates.

### 4. Novo hook: `src/hooks/useMessageDetails.ts`

Hidratação on-demand via React Query:

```ts
export function useMessageDetails(messageId: string | null, opts?: { enabled?: boolean })
  : { data: EvolutionMessage | null; isLoading: boolean; error: Error | null }
```

- `queryKey: ['message-details', messageId]`
- `enabled: !!messageId && opts?.enabled !== false`
- `staleTime: 5 * 60_000` (payload imutável após gravação — cache longo)
- Chama `externalSupabase.rpc('rpc_get_message_details', { p_message_id })`.
- Instrumentado via `timedRpc` (telemetria do plano anterior).

### 5. Componente: `src/components/inbox/chat/MessageDetailsDialog.tsx`

Dialog reutilizável que abre via prop `messageId` e renderiza:
- Cabeçalho: `id`, `message_id`, `created_at`, `direction`, `status`, `message_type`, `instance_name`.
- Tabs: **Conteúdo** (content/caption/media), **Payload** (`<pre>` JSON pretty), **Raw Data** (`<pre>` JSON pretty), **Histórico** (futuras mudanças de status).
- Loading inline enquanto `useMessageDetails` busca.
- Botão "Copiar JSON" para payload e raw_data (respeitando política Zero Export — copy é permitido para admin/supervisor; gating via `useAuth().role`).

### 6. Wiring: gatilho no `MessageBubble`

No menu de contexto da mensagem (long-press / right-click), adicionar item **"Detalhes do envio"** visível apenas para `admin`/`supervisor`. Clique → `setDetailsMessageId(msg.id)` → renderiza `MessageDetailsDialog`. Estado vive no `ChatPanel` para evitar re-mount por mensagem.

### 7. Atualizar consumidores que dependiam de payload no list

- `useConversationSLATimeline.ts`: já usa `rpc_list_messages` para pegar timestamps — campos lite já são suficientes. Trocar para `rpc_list_messages_lite`.
- `AdminFailedMessagesPage` consulta `messages` do Lovable Cloud (não FATOR X) — não muda.
- Qualquer outro consumidor real-time de payload (`useRealtimeMessages`, etc.) é fora do escopo: continuam acessando full row (são poucos eventos).

### 8. Testes

`src/hooks/__tests__/useMessagesCursor.test.tsx` (atualizar):
- Verifica que mock de `rpc_list_messages_lite` é chamada (nome novo).
- Mock retorna rows sem `payload`/`raw_data` — assert que hook não quebra.

`src/hooks/__tests__/useMessageDetails.test.tsx` (novo):
1. Não dispara fetch quando `messageId` é null.
2. Dispara `rpc_get_message_details` com `p_message_id` correto.
3. Cache hit em segunda chamada com mesmo id (staleTime > 0).
4. Erro propagado em `error`.

`src/components/inbox/chat/__tests__/MessageDetailsDialog.test.tsx`:
1. Renderiza spinner enquanto carrega.
2. Renderiza tabs Payload/RawData com JSON pretty.
3. Botão "Copiar JSON" só aparece para admin/supervisor.

## Arquivos

| Ação | Arquivo |
|---|---|
| Criar | `supabase/migrations/<ts>_rpc_list_messages_lite.sql` (no projeto FATOR X) |
| Editar | `src/types/evolutionExternal.ts` (adicionar `EvolutionMessageLite`) |
| Editar | `src/hooks/useMessagesCursor.ts` (lite + helper `toLite`) |
| Editar | `src/hooks/__tests__/useMessagesCursor.test.tsx` |
| Editar | `src/hooks/useConversationSLATimeline.ts` (RPC lite) |
| Criar | `src/hooks/useMessageDetails.ts` |
| Criar | `src/hooks/__tests__/useMessageDetails.test.tsx` |
| Criar | `src/components/inbox/chat/MessageDetailsDialog.tsx` |
| Criar | `src/components/inbox/chat/__tests__/MessageDetailsDialog.test.tsx` |
| Editar | `src/components/inbox/chat/MessageBubble.tsx` (item "Detalhes do envio") |
| Editar | `src/components/inbox/ChatPanel.tsx` (estado `detailsMessageId` + dialog) |

## Não-objetivos

- Não remover `rpc_list_messages` original — outros call sites podem precisar; depreciação fica para um próximo lote.
- Não migrar `useMessages` (Lovable Cloud) — escopo é FATOR X.
- Não tocar em `evolution_audit_log` (que tem seu próprio detail).
- Não implementar prefetch de detalhes em hover — sob demanda apenas, conforme pedido.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Migration SQL precisa ser aplicada no projeto FATOR X (externo), não no Lovable Cloud | Operador executa via tool de migração apontando para `tdprnylgyrogbbhgdoik`. Plano deixa SQL pronto. |
| Realtime traz payload completo e infla memória | Helper `toLite(m)` projeta o objeto antes de `setPages`. |
| Algum consumidor existente acessa `m.payload` no array da lista | Tipo `EvolutionMessageLite` é estritamente menor → TS aponta erro em build. Resolvemos caso a caso. |
| Política Zero Export no MessageDetailsDialog | "Copiar JSON" só para admin/supervisor; sem botão de download de arquivo, conforme `mem://security/data-export-and-protection-policy`. |
| Cache stale de detalhes após edição | UPDATE realtime no `useMessagesCursor` invalida `['message-details', id]` via queryClient. |
