/**
 * Datasource Sentinel — Audit and prevent misuse of standard Supabase client
 * for evolution_* tables, ensuring they use externalSupabase.
 */
import { ENTITY_MAP, type LogicalEntity } from './registry';

/**
 * Validates that an entity is being accessed through the correct client.
 * Throws if a standard Supabase call is made to an 'external' entity.
 */
export function validateEntityAccess(entity: string, clientName: 'lovable' | 'external'): void {
  // Find if this table/entity is registered as external
  const mapping = Object.values(ENTITY_MAP).find(m => m.table === entity);
  
  if (mapping && mapping.client === 'external' && clientName === 'lovable') {
    const errorMsg = `[Datasource Sentinel] SECURITY VIOLATION: Attempted to access external table "${entity}" using Lovable Cloud client. Use dbFrom('${entity}') or externalSupabase instead.`;
    console.error(errorMsg);
    // In production we might just log, but in dev/test we fail fast
    if (import.meta.env.DEV) {
      throw new Error(errorMsg);
    }
  }

  // Prevent any evolution_* access on lovable client even if not in ENTITY_MAP
  if (entity.startsWith('evolution_') && clientName === 'lovable') {
    const errorMsg = `[Datasource Sentinel] CRITICAL: Hardcoded reference to "${entity}" detected on Lovable client. Tables evolution_* MUST use externalSupabase.`;
    console.error(errorMsg);
    if (import.meta.env.DEV) {
      throw new Error(errorMsg);
    }
  }
}

/**
 * Validates RPC calls to ensure evolution_* functions are not called on the wrong client.
 */
export function validateRpcAccess(name: string, clientName: 'lovable' | 'external'): void {
  const isEvolutionRpc = name.startsWith('rpc_list_') || 
                         name.startsWith('rpc_get_') || 
                         name.startsWith('rpc_insert_') || 
                         name.startsWith('rpc_upsert_') ||
                         name.includes('evolution');

  if (isEvolutionRpc && clientName === 'lovable') {
     const errorMsg = `[Datasource Sentinel] SECURITY VIOLATION: RPC "${name}" appears to be an evolution function but was called via Lovable client.`;
     console.error(errorMsg);
     if (import.meta.env.DEV) {
       throw new Error(errorMsg);
     }
  }
}
