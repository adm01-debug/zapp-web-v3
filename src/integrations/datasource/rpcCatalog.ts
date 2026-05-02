/**
 * RPC Catalog — fonte única e tipada das RPCs do FATOR X.
 *
 * Toda leitura/escrita do domínio WhatsApp/CRM (`evolution_*`) deve passar
 * por uma RPC SECURITY DEFINER no self-hosted (RLS bloqueia SELECT direto
 * para `anon`). Este catálogo amarra cada RPC ao shape de `params` e ao
 * shape da `row` retornada, e aplica defaults (ex.: `p_instance: 'wpp2'`).
 *
 * Uso (via helpers em ./db.ts):
 *
 *   import { dbList, dbGet, dbInsert } from '@/integrations/datasource/db';
 *   import { RPC } from '@/integrations/datasource/rpcCatalog';
 *
 *   const { data: msgs } = await dbList(RPC.listMessagesLite, {
 *     p_remote_jid: jid, p_limit: 50,
 *   });
 *
 * Para adicionar uma RPC nova:
 *  1. Confirme que ela existe no project-knowledge / migrations FATOR X.
 *  2. Adicione uma entrada em `RPC` com o tipo de params e de row.
 *  3. Use via dbList/dbGet/dbInsert — nunca via getExternalSupabase().rpc direto.
 */
import type {
  EvolutionContact,
  EvolutionMessage,
  EvolutionConversation,
} from '@/types/evolutionExternal';

export type DatasourceClient = 'lovable' | 'external';

export interface RpcDefinition<TParams, TRow> {
  /** Nome exato da função SQL no banco. */
  readonly name: string;
  /** Qual cliente expõe a RPC. */
  readonly client: DatasourceClient;
  /** Defaults aplicados antes do `params` do call site (ex.: instance). */
  readonly defaults?: Partial<TParams>;
  /** Phantom marker — preserva `TRow` no tipo da definição. */
  readonly __row?: TRow;
}

// ─────────────────────────────────────────────────────────────────────────────
// Param shapes
// ─────────────────────────────────────────────────────────────────────────────

interface ListContactsParams {
  p_instance?: string;
  p_lead_status?: string | null;
  p_assigned_to?: string | null;
  p_search?: string | null;
  p_limit?: number;
  p_offset?: number;
}

interface GetContactParams {
  p_remote_jid: string;
  p_instance?: string;
}

interface ListMessagesParams {
  p_remote_jid: string;
  p_instance?: string;
  p_limit?: number;
  p_before_date?: string | null;
}

interface ListMessagesLiteParams {
  p_remote_jid: string;
  p_limit?: number;
  p_offset?: number;
}

interface ListConversationsParams {
  p_instance?: string;
  p_status?: string | null;
  p_assigned_to?: string | null;
  p_limit?: number;
}

interface ListCallsParams {
  p_remote_jid?: string | null;
  p_instance?: string;
  p_limit?: number;
}

interface ListAuditLogParams {
  p_entity_type?: string | null;
  p_entity_id?: string | null;
  p_action?: string | null;
  p_performed_by?: string | null;
  p_limit?: number;
  p_offset?: number;
}

interface InsertMessageParams {
  p_remote_jid: string;
  p_content: string;
  p_message_type?: string;
  p_message_id?: string;
  p_from_me?: boolean;
}

interface UpsertContactParams {
  p_remote_jid: string;
  p_instance?: string;
  p_push_name?: string | null;
  p_notes?: string | null;
}

interface DeleteContactParams {
  p_remote_jid: string;
  p_instance?: string;
  p_performed_by: string;
}

interface DashboardHomeParams {
  p_instance?: string;
  p_assigned_to?: string | null;
}

interface GlobalSearchParams {
  p_query: string;
  p_instance?: string;
  p_limit?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Catalog
// ─────────────────────────────────────────────────────────────────────────────

const def = <P, R>(d: RpcDefinition<P, R>) => d;

const DEFAULT_INSTANCE = { p_instance: 'wpp2' } as const;

export const RPC = {
  // ── Reads ────────────────────────────────────────────────────────────────
  listContacts: def<ListContactsParams, EvolutionContact[]>({
    name: 'rpc_list_contacts',
    client: 'external',
    defaults: DEFAULT_INSTANCE,
  }),
  getContact: def<GetContactParams, EvolutionContact>({
    name: 'rpc_get_contact',
    client: 'external',
    defaults: DEFAULT_INSTANCE,
  }),
  listMessages: def<ListMessagesParams, EvolutionMessage[]>({
    name: 'rpc_list_messages',
    client: 'external',
    defaults: DEFAULT_INSTANCE,
  }),
  listMessagesLite: def<ListMessagesLiteParams, EvolutionMessage[]>({
    name: 'rpc_list_messages_lite',
    client: 'external',
  }),
  listConversations: def<ListConversationsParams, EvolutionConversation[]>({
    name: 'rpc_list_conversations',
    client: 'external',
    defaults: DEFAULT_INSTANCE,
  }),
  listCalls: def<ListCallsParams, unknown[]>({
    name: 'rpc_list_calls',
    client: 'external',
    defaults: DEFAULT_INSTANCE,
  }),
  listAuditLog: def<ListAuditLogParams, unknown[]>({
    name: 'rpc_list_audit_log',
    client: 'external',
  }),

  // ── Writes ───────────────────────────────────────────────────────────────
  insertMessage: def<InsertMessageParams, EvolutionMessage>({
    name: 'rpc_insert_message',
    client: 'external',
  }),
  upsertContact: def<UpsertContactParams, EvolutionContact>({
    name: 'rpc_upsert_contact',
    client: 'external',
    defaults: DEFAULT_INSTANCE,
  }),
  deleteContact: def<DeleteContactParams, boolean>({
    name: 'rpc_delete_contact',
    client: 'external',
    defaults: DEFAULT_INSTANCE,
  }),

  // ── Analytics / Search ───────────────────────────────────────────────────
  dashboardHome: def<DashboardHomeParams, unknown>({
    name: 'rpc_dashboard_home',
    client: 'external',
    defaults: DEFAULT_INSTANCE,
  }),
  globalSearch: def<GlobalSearchParams, unknown>({
    name: 'rpc_global_search',
    client: 'external',
  }),
} as const;

export type RpcKey = keyof typeof RPC;
