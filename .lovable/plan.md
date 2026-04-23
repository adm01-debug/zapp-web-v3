

## Listener de broadcast para chamadas recebidas no inbox

### Contexto

Hoje `useIncomingCallListener` escuta `postgres_changes` na tabela legada `calls` (Lovable Cloud) e busca o contato com fallback para "Desconhecido". Isso tem dois problemas:

1. **Latência alta**: depende do INSERT propagar via replication.
2. **Acoplado ao schema legado**: nome/avatar vêm de `contacts` (Lovable Cloud), não de `evolution_contacts` (FATOR X) onde os dados ricos do WhatsApp vivem (`push_name`, `profile_picture_url`).

A pedido: usar **broadcast** (canal Realtime efêmero, sub-100ms) emitido pelo webhook no momento do evento `CALL`, e o cliente resolve nome+avatar via `remote_jid` no FATOR X.

### Decisão

- **Webhook** (`handleCallEvent`) emite `broadcast` no canal global `incoming-calls:wpp2` com payload mínimo (`remote_jid`, `is_video`, `call_status`, `agent_profile_id`, `started_at`, `wa_call_id`).
- **Hook novo** `useIncomingCallBroadcast` subscreve esse canal no `externalClient`, filtra pelo `agent_profile_id` do usuário, e dispara um lookup `rpc_get_contact({ p_remote_jid })` para resolver `push_name` + `profile_picture_url`.
- **Componente** `IncomingCallAlert` ganha uma fonte adicional (broadcast), mantendo o listener antigo de `postgres_changes` como **fallback** durante migração.

### Arquivos

**Editado (1):**

1. `supabase/functions/_shared/evolution-webhook-handlers.ts` — em `handleCallEvent`, após o INSERT em `calls`, emite broadcast:
   ```ts
   const channel = supabase.channel(`incoming-calls:${instance}`);
   await channel.send({
     type: 'broadcast',
     event: 'call_received',
     payload: {
       remote_jid: from,
       is_video: !!isVideo,
       call_status: callStatus || 'ringing',
       agent_profile_id: agentId,
       started_at: new Date().toISOString(),
       wa_call_id: callData.id ?? null,
     },
   });
   supabase.removeChannel(channel);
   ```
   - Payload **não contém PII** além do JID (que o cliente já tem acesso via RPC). Nome/avatar resolvidos no cliente.
   - Mantém INSERT em `calls` + `notifications` (compat).

**Criados (2):**

2. `src/hooks/useIncomingCallBroadcast.ts` — hook novo:
   - Assinatura: `useIncomingCallBroadcast(): { incomingCall: IncomingCall | null; dismissCall: () => void }`.
   - Subscreve `externalClient.channel('incoming-calls:wpp2').on('broadcast', { event: 'call_received' }, handler)`.
   - No handler:
     - Filtra `payload.agent_profile_id === profile?.id` (ou `null` = broadcast geral, opcional).
     - Chama `externalClient.rpc('rpc_get_contact', { p_remote_jid: payload.remote_jid, p_instance: 'wpp2' })` para obter `push_name`, `profile_picture_url`, `name`, `phone`.
     - Constrói `IncomingCall` (mesma shape de `useIncomingCallListener`) com `contact_name`, `contact_phone`, `contact_avatar_url`, `is_video`, `started_at`.
   - Cleanup: `externalClient.removeChannel`.
   - Logger: `getLogger('IncomingCallBroadcast')`.

3. `src/hooks/__tests__/useIncomingCallBroadcast.test.ts` — vitest:
   - Mock `externalClient.channel/on/subscribe/removeChannel` + `rpc('rpc_get_contact', …)`.
   - Casos: broadcast com `agent_profile_id` correto resolve contato e seta `incomingCall`; broadcast com `agent_profile_id` de outro agente é ignorado; `rpc_get_contact` falhando ainda gera alerta com fallback `phone`; `dismissCall` zera o estado; cleanup remove canal.

**Editado (2):**

4. `src/components/calls/IncomingCallAlert.tsx`:
   - Importa `useIncomingCallBroadcast` além do `useIncomingCallListener`.
   - Usa `incomingCall = broadcastCall ?? legacyCall` (broadcast tem prioridade — chega primeiro).
   - `dismissCall()` chama ambos os dismissers.
   - Renderiza `Avatar` com `AvatarImage src={incomingCall.contact_avatar_url}` quando disponível, mantendo `AvatarFallback` com iniciais.

5. `src/types/incomingCall.ts` (extrai a interface `IncomingCall` para evitar import circular entre os dois hooks):
   - Move `interface IncomingCall { ... contact_avatar_url?: string | null; ... }` do hook legado para o tipo compartilhado; ambos os hooks importam dele.

### Detalhes técnicos

- **Cliente correto**: `externalClient` no front (mesmo bus do webhook). Lovable Cloud `supabase` não recebe esse broadcast.
- **Topic estável**: `incoming-calls:${instance}` — instance fixa em `wpp2` por enquanto, parametrizável no hook.
- **Sem persistência**: broadcast é fire-and-forget; o INSERT em `calls` continua sendo a fonte de verdade para histórico (já existe). Por isso mantemos o listener legado como fallback (caso o agente abra o app **depois** do broadcast).
- **Filtragem de agente**: feita no cliente (broadcast vai pra todos os subscribers do topic). Aceitável: payload é mínimo e o lookup PII só roda quando o filtro passa.
- **Defesa de broadcast (memória `inbox/broadcast-defense`)**: filtra `remote_jid` que case `/@broadcast$/` antes de processar.
- **Acessibilidade**: alerta já é `forwardRef` e usa `AnimatePresence` corretamente — sem mudança aqui.
- **Logger**: warn quando payload malformado; error quando `rpc_get_contact` falhar.

### Fora de escopo

- Migrar INSERT do webhook para `rpc_insert_call` no FATOR X (não existe ainda evento de chamada chegando lá; fica para lote de migração de calls).
- Remover o listener legado `useIncomingCallListener` — manter como fallback até confirmar paridade em produção.
- Modal de atendimento (`CallDialog`) — sem mudanças, já consumido pelo alerta.
- Notificação push/sirene global — já tratada por `useNotificationSettings` no componente.

