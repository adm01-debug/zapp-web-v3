## Objetivo

Hoje `src/integrations/datasource/db.ts` resolve apenas `from()` e `channel()`. Mas a regra do projeto (project-knowledge) é clara: **toda leitura/escrita em `evolution_*` deve passar por RPC** (`rpc_list_contacts`, `rpc_insert_message`, etc.) — `dbFrom('contacts').select()` é bloqueado por RLS.

Resultado: o código está dividido em duas convenções:
- Quem usa `dbFrom('contacts').select(...)` → quebra silenciosamente em produção (RLS).
- Quem usa `getExternalSupabase().rpc('rpc_list_contacts', {...})` → funciona, mas cada hook repete o boilerplate (null-check, telemetria, tipos `any`).

A camada única vai padronizar a segunda convenção e dar um caminho de migração para a primeira.

## O que vou criar

### 1. `src/integrations/datasource/rpcCatalog.ts` (novo)

Catálogo tipado das RPCs do FATOR X já documentadas no project-knowledge. Cada entrada amarra nome da RPC ao shape de `params` e ao shape de `row` retornada:

```ts
export interface RpcDefinition<P, R> {
  name: string;
  client: 'external' | 'lovable';
  defaults?: Partial<P>;
}

export const RPC = {
  listContacts: {
    name: 'rpc_list_contacts',
    client: 'external',
    defaults: { p_instance: 'wpp2' },
  } as RpcDefinition<{ p_instance?: string; p_lead_status?: string; p_assigned_to?: string;
                       p_search?: string; p_limit?: number; p_offset?: number }, EvolutionContact>,

  getContact:        { name: 'rpc_get_contact',       client: 'external', defaults: { p_instance: 'wpp2' } } as RpcDefinition<{ p_remote_jid: string; p_instance?: string }, EvolutionContact>,
  listMessages:      { name: 'rpc_list_messages',     client: 'external', defaults: { p_instance: 'wpp2' } } as RpcDefinition<{ p_remote_jid: string; p_instance?: string; p_limit?: number; p_before_date?: string }, EvolutionMessage>,
  listMessagesLite:  { name: 'rpc_list_messages_lite', client: 'external' } as RpcDefinition<{ p_remote_jid: string; p_limit?: number; p_offset?: number }, EvolutionMessage>,
  listConversations: { name: 'rpc_list_conversations', client: 'external', defaults: { p_instance: 'wpp2' } } as RpcDefinition<{ p_instance?: string; p_status?: string; p_assigned_to?: string; p_limit?: number }, EvolutionConversation>,
  listCalls:         { name: 'rpc_list_calls',         client: 'external', defaults: { p_instance: 'wpp2' } } as RpcDefinition<{ p_remote_jid?: string; p_instance?: string; p_limit?: number }, EvolutionCall>,
  listAuditLog:      { name: 'rpc_list_audit_log',     client: 'external' } as RpcDefinition<{ p_entity_type?: string; p_entity_id?: string; p_action?: string; p_limit?: number; p_offset?: number }, EvolutionAuditLog>,

  insertMessage:     { name: 'rpc_insert_message',     client: 'external' } as RpcDefinition<{ p_remote_jid: string; p_content: string; p_message_type?: string; p_message_id?: string; p_from_me?: boolean }, EvolutionMessage>,
  upsertContact:     { name: 'rpc_upsert_contact',     client: 'external', defaults: { p_instance: 'wpp2' } } as RpcDefinition<{ p_remote_jid: string; p_instance?: string; p_push_name?: string; p_notes?: string }, EvolutionContact>,
  deleteContact:     { name: 'rpc_delete_contact',     client: 'external', defaults: { p_instance: 'wpp2' } } as RpcDefinition<{ p_remote_jid: string; p_instance?: string; p_performed_by: string }, boolean>,

  dashboardHome:     { name: 'rpc_dashboard_home',     client: 'external', defaults: { p_instance: 'wpp2' } } as RpcDefinition<{ p_instance?: string; p_assigned_to?: string | null }, unknown>,
  globalSearch:      { name: 'rpc_global_search',      client: 'external' } as RpcDefinition<{ p_query: string; p_instance?: string; p_limit?: number }, unknown>,
} as const;
```

Isso resolve dois problemas: `defaults` automatizam `p_instance: 'wpp2'` (lei do projeto) e o tipo de retorno some do call site.

### 2. Estender `src/integrations/datasource/db.ts` com `dbRpc`

Adiciona três funções ao arquivo existente, mantendo `dbFrom`/`dbChannel`/`dbTable` como estão:

```ts
import { recordQueryEvent, classifySeverity } from '@/lib/clientTelemetry';
import { generateCorrelationId } from '@/lib/correlationId';
import { RPC, type RpcDefinition } from './rpcCatalog';

interface RpcResult<R> { data: R | null; error: unknown; correlationId: string; }

/** Chama uma RPC do catálogo com defaults aplicados, telemetria e correlationId. */
export async function dbRpc<P extends object, R>(
  def: RpcDefinition<P, R>,
  params: P,
): Promise<RpcResult<R>> {
  const client  = def.client === 'external' ? externalSupabase : supabase;
  if (!client) throw new Error(`[datasource] cliente "${def.client}" indisponível para ${def.name}`);

  const merged = { ...(def.defaults ?? {}), ...params };
  const startedAt = performance.now();
  const correlationId = generateCorrelationId();
  try {
    const { data, error } = await client.rpc(def.name, merged as object);
    const durationMs = Math.round(performance.now() - startedAt);
    recordQueryEvent({
      operation: 'rpc',
      source: def.client === 'external' ? 'externalSupabase' : 'supabase',
      target: def.name,
      durationMs,
      filters: merged,
      recordCount: Array.isArray(data) ? data.length : null,
      errorMessage: error?.message,
      severity: classifySeverity(durationMs, !!error, false),
      startedAt, correlationId,
    });
    return { data: (data as R) ?? null, error, correlationId };
  } catch (err) {
    const durationMs = Math.round(performance.now() - startedAt);
    recordQueryEvent({ operation: 'rpc', source: def.client === 'external' ? 'externalSupabase' : 'supabase',
      target: def.name, durationMs, filters: merged, recordCount: null,
      errorMessage: (err as Error).message, severity: 'error', startedAt, correlationId });
    throw err;
  }
}

/** Conveniências para os 3 padrões mais comuns. */
export const dbList   = <P extends object, R>(def: RpcDefinition<P, R[]>, params: P) => dbRpc<P, R[]>(def, params);
export const dbGet    = <P extends object, R>(def: RpcDefinition<P, R>,   params: P) => dbRpc<P, R>(def, params);
export const dbInsert = <P extends object, R>(def: RpcDefinition<P, R>,   params: P) => dbRpc<P, R>(def, params);
```

`dbList`/`dbGet`/`dbInsert` são apenas aliases nominais — todos chamam `dbRpc` por baixo. Servem para deixar a intenção legível no call site.

### 3. Atualizar `src/integrations/datasource/registry.ts`

Adicionar comentário cabeçalho explicando a divisão:
- `dbFrom`/`dbChannel`/`dbTable` → para entidades **lovable** (profiles, queues, whatsapp_connections) e realtime de evolution_*.
- `dbRpc`/`dbList`/`dbGet`/`dbInsert` → para **toda** leitura/escrita de domínio em FATOR X (contacts, messages, conversations, calls, audit_log).

Sem mudança de runtime, só docstring.

### 4. Migrar 1 call site real como prova de conceito

`src/features/inbox/data-access/messageRepository.ts` ganha um método novo:

```ts
async listByContactJid(remoteJid: string, limit = 1000) {
  return dbList(RPC.listMessagesLite, { p_remote_jid: remoteJid, p_limit: limit });
}
```

(Mantém `fetchMessagesByContact` antigo intocado para não quebrar consumidores — migração incremental.)

## Por que essa forma e não outra

- **Não migro os 30+ call sites em massa nesta rodada.** O escopo é "criar a camada"; migração vira PR seguinte por feature (inbox, contacts, dashboard, etc.).
- **Não removo `getExternalSupabase().rpc(...)` direto** — `useExternalDB.ts` é genérico (RPC dinâmica via parâmetro) e não cabe no catálogo tipado. Continua usando o helper antigo.
- **Não adiciono nova entidade ao `ENTITY_MAP`** — o registry continua sendo só sobre `from()`/`channel()`. As RPCs vivem no `rpcCatalog.ts` separado, porque o conceito é diferente (uma entidade pode ter N RPCs).
- **Reaproveito a telemetria** que já existe em `src/lib/instrumentedExternal.ts` — não duplico, apenas chamo as mesmas funções (`recordQueryEvent`, `classifySeverity`, `generateCorrelationId`).

## Arquivos tocados

| Arquivo | Ação |
|---|---|
| `src/integrations/datasource/rpcCatalog.ts` | criar |
| `src/integrations/datasource/db.ts` | adicionar `dbRpc`, `dbList`, `dbGet`, `dbInsert` |
| `src/integrations/datasource/registry.ts` | docstring sobre quando usar cada caminho |
| `src/features/inbox/data-access/messageRepository.ts` | adicionar `listByContactJid` (POC) |

Build deve continuar verde — zero call site existente é alterado.

## Validação

1. `bun run typecheck` → 0 erros.
2. `bun run build` → bundle gerado.
3. Inspeção manual: chamar `dbList(RPC.listContacts, { p_limit: 10 })` em `useContacts.ts` (já num PR seguinte) e ver no painel de telemetria a entrada com `target: 'rpc_list_contacts'`.

Aprova para eu executar?
