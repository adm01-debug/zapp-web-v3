/**
 * Datasource proxy — escolhe automaticamente o SupabaseClient correto
 * (Lovable Cloud vs self-hosted) e a tabela física para uma entidade lógica.
 *
 * Uso:
 *   import { dbFrom, dbChannel, dbTable, dbClient } from '@/integrations/datasource/db';
 *
 *   const { data } = await dbFrom('messages').select('*').eq('contact_id', id);
 *   const channel = dbChannel('messages', `msgs:${id}`)
 *     .on('postgres_changes',
 *         { event: '*', schema: 'public', table: dbTable('messages'),
 *           filter: `contact_id=eq.${id}` },
 *         handler)
 *     .subscribe();
 *
 * O retorno de `dbFrom`/`dbChannel` é tipado como `any` porque os schemas do
 * cliente self-hosted não fazem parte do `Database` gerado pelo Lovable.
 * Tratar a forma da linha como contrato do consumidor.
 */
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { ENTITY_MAP, type LogicalEntity } from './registry';
import { recordQueryEvent, classifySeverity } from '@/lib/clientTelemetry';
import { generateCorrelationId } from '@/lib/correlationId';
import type { RpcDefinition, DatasourceClient } from './rpcCatalog';

export function dbClient(entity: LogicalEntity): SupabaseClient {
  const mapping = ENTITY_MAP[entity];
  const target = mapping.client === 'external' ? externalSupabase : supabase;
  if (!target) {
    throw new Error(
      `[datasource] Cliente "${mapping.client}" para entidade "${entity}" não está configurado.`,
    );
  }
  return target as SupabaseClient;
}

export function dbTable(entity: LogicalEntity): string {
  return ENTITY_MAP[entity].table;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbFrom(entity: LogicalEntity): any {
  return dbClient(entity).from(dbTable(entity));
}

export function dbChannel(entity: LogicalEntity, name: string): RealtimeChannel {
  return dbClient(entity).channel(`${name}:${dbTable(entity)}`);
}

export function dbRemoveChannel(entity: LogicalEntity, channel: RealtimeChannel): void {
  dbClient(entity).removeChannel(channel);
}

// ─────────────────────────────────────────────────────────────────────────────
// RPC layer — padrão para toda leitura/escrita em `evolution_*` (FATOR X).
//
// `dbFrom`/`dbChannel` acima continuam servindo entidades Lovable Cloud e
// realtime. Para o domínio de WhatsApp/CRM use SEMPRE as RPCs:
//
//   const { data } = await dbList(RPC.listMessagesLite, {
//     p_remote_jid: jid, p_limit: 50,
//   });
//
// `dbList`/`dbGet`/`dbInsert` são aliases nominais — todos delegam a `dbRpc`.
// Servem para deixar a intenção legível no call site.
// ─────────────────────────────────────────────────────────────────────────────

export interface DbRpcResult<R> {
  data: R | null;
  error: unknown;
  correlationId: string;
}

function rpcClient(client: DatasourceClient): SupabaseClient {
  const target = client === 'external' ? externalSupabase : supabase;
  if (!target) {
    throw new Error(`[datasource] cliente "${client}" indisponível para RPC.`);
  }
  return target as SupabaseClient;
}

export async function dbRpc<P extends object, R>(
  def: RpcDefinition<P, R>,
  params: P,
): Promise<DbRpcResult<R>> {
  const client = rpcClient(def.client);
  const merged = { ...(def.defaults ?? {}), ...params };
  const startedAt = performance.now();
  const correlationId = generateCorrelationId();
  const source = def.client === 'external' ? 'externalSupabase' : 'lovableCloud';

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client as any).rpc(def.name, merged as any);
    const durationMs = Math.round(performance.now() - startedAt);
    const errorMessage = error ? error.message ?? 'rpc error' : undefined;

    recordQueryEvent({
      operation: 'rpc',
      source,
      target: def.name,
      durationMs,
      limit: (merged as any).p_limit ?? null,
      offset: (merged as any).p_offset ?? null,
      filters: merged as Record<string, unknown>,
      recordCount: Array.isArray(data) ? data.length : null,
      errorMessage,
      severity: classifySeverity(durationMs, !!error, false),
      startedAt,
      correlationId,
    });

    return { data: (data as R) ?? null, error, correlationId };
  } catch (err) {
    const durationMs = Math.round(performance.now() - startedAt);
    const message = (err as Error)?.message ?? 'rpc error';
    const isTimeout = (err as Error)?.name === 'TimeoutError' || /timeout/i.test(message);

    recordQueryEvent({
      operation: 'rpc',
      source,
      target: def.name,
      durationMs,
      limit: (merged as any).p_limit ?? null,
      offset: (merged as any).p_offset ?? null,
      filters: merged as Record<string, unknown>,
      recordCount: null,
      errorMessage: message,
      severity: isTimeout ? 'timeout' : 'error',
      startedAt,
      correlationId,
    });
    throw err;
  }
}

/** Lista (RPC que retorna array). Alias semântico de `dbRpc`. */
export const dbList = <P extends object, R>(
  def: RpcDefinition<P, R[]>,
  params: P,
): Promise<DbRpcResult<R[]>> => dbRpc<P, R[]>(def, params);

/** Busca individual (RPC que retorna single row). Alias semântico de `dbRpc`. */
export const dbGet = <P extends object, R>(
  def: RpcDefinition<P, R>,
  params: P,
): Promise<DbRpcResult<R>> => dbRpc<P, R>(def, params);

/** Inserção/escrita (RPC mutation). Alias semântico de `dbRpc`. */
export const dbInsert = <P extends object, R>(
  def: RpcDefinition<P, R>,
  params: P,
): Promise<DbRpcResult<R>> => dbRpc<P, R>(def, params);

