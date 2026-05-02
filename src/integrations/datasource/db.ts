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
