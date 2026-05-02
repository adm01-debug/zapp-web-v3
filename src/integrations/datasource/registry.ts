/**
 * Datasource Registry — fonte única da verdade para roteamento de entidades.
 *
 * O ZAPP Web vive em DOIS Supabase coexistindo:
 *  - `lovable`  → Lovable Cloud (auth, profiles, queues, whatsapp_connections, etc.)
 *  - `external` → Supabase self-hosted em supabase.atomicabr.com.br
 *                 (todo o domínio de WhatsApp/CRM nas tabelas evolution_*).
 *
 * Toda chamada a `messages`, `contacts`, `conversations`, `audit_log`, `calls`
 * DEVE passar pelos helpers em `./db.ts` para acertar automaticamente o cliente
 * e a tabela física correta.
 *
 * Para adicionar uma nova entidade:
 *  1. Adicione o nome em `LogicalEntity`.
 *  2. Mapeie em `ENTITY_MAP` para `{ client, table }`.
 *  3. Use `dbFrom('nova-entidade')` no código — nunca `supabase.from(...)` direto.
 */

export type LogicalEntity =
  | 'messages'
  | 'contacts'
  | 'conversations'
  | 'audit_log'
  | 'calls'
  | 'profiles'
  | 'user_roles'
  | 'queues'
  | 'whatsapp_connections';

export type DatasourceClient = 'lovable' | 'external';

export interface EntityMapping {
  client: DatasourceClient;
  table: string;
}

export const ENTITY_MAP = {
  // ── Self-hosted (supabase.atomicabr.com.br) ─────────────────────────────
  messages:             { client: 'external', table: 'evolution_messages' },
  contacts:             { client: 'external', table: 'evolution_contacts' },
  conversations:        { client: 'external', table: 'evolution_conversations' },
  audit_log:            { client: 'external', table: 'evolution_audit_log' },
  calls:                { client: 'external', table: 'evolution_calls' },

  // ── Lovable Cloud ───────────────────────────────────────────────────────
  profiles:             { client: 'lovable',  table: 'profiles' },
  user_roles:           { client: 'lovable',  table: 'user_roles' },
  queues:               { client: 'lovable',  table: 'queues' },
  whatsapp_connections: { client: 'lovable',  table: 'whatsapp_connections' },
} as const satisfies Record<LogicalEntity, EntityMapping>;

export function getEntityMapping(entity: LogicalEntity): EntityMapping {
  return ENTITY_MAP[entity];
}
