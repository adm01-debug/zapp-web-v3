
import { supabase as _supabase } from './client';
import { PostgrestError } from '@supabase/supabase-js';

const supabase = _supabase as any;

/**
 * Interface para retorno padronizado do safeClient
 */
export interface SafeResponse<T> {
  data: T | null;
  error: Error | null;
}

/**
 * safeClient — Wrapper para chamadas Supabase com tratamento de erro e tipagem opcional.
 * Resolve problemas de tabelas não tipadas e schemas externos.
 */
/**
 * Cache de recursos validados para evitar chamadas repetidas ao schema
 */
const validatedResources = new Set<string>();

/**
 * safeClient — Wrapper para chamadas Supabase com tratamento de erro e tipagem opcional.
 * Resolve problemas de tabelas não tipadas e schemas externos.
 */
export const safeClient = {
  /**
   * Executa uma query 'from' com tratamento de erro e validação de existência
   */
  async from<T = any>(
    table: string,
    queryBuilder: (query: any) => any
  ): Promise<SafeResponse<T[]>> {
    try {
      // Validação automática para tabelas gmail_*
      if (table.startsWith('gmail_') && !validatedResources.has(table)) {
        const exists = await this.validateResource(table, 'table');
        if (!exists) {
          console.warn(`[safeClient] Tabela ${table} não encontrada no schema.`);
          return { data: [] as T[], error: new Error(`Tabela ${table} não disponível`) };
        }
        validatedResources.add(table);
      }

      const { data, error } = await queryBuilder(supabase.from(table) as any);
      if (error) return { data: [] as T[], error: this.formatError(error) };
      
      // Garantir que data seja sempre um array se for uma query 'from' padrão
      return { data: (Array.isArray(data) ? data : []) as T[], error: null };
    } catch (err) {
      console.error(`[safeClient] Erro ao consultar tabela ${table}:`, err);
      return { data: [] as T[], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Executa uma query 'from' que retorna um único item
   */
  async single<T = any>(
    table: string,
    queryBuilder: (query: any) => any
  ): Promise<SafeResponse<T>> {
    try {
      if (table.startsWith('gmail_') && !validatedResources.has(table)) {
        const exists = await this.validateResource(table, 'table');
        if (!exists) return { data: null, error: new Error(`Tabela ${table} não disponível`) };
        validatedResources.add(table);
      }

      const { data, error } = await queryBuilder(supabase.from(table) as any).single();
      if (error) return { data: null, error: this.formatError(error) };
      return { data: data as T, error: null };
    } catch (err) {
      console.error(`[safeClient] Erro ao consultar item na tabela ${table}:`, err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Executa um RPC com validação e tratamento de erro
   */
  async rpc<T = any>(
    name: string,
    params?: Record<string, any>
  ): Promise<SafeResponse<T>> {
    try {
      // Validação automática para RPCs rpc_gmail_*
      if (name.startsWith('rpc_gmail_') && !validatedResources.has(name)) {
        const exists = await this.validateResource(name, 'function');
        if (!exists) {
          console.warn(`[safeClient] RPC ${name} não encontrada no schema.`);
          return { data: null, error: new Error(`Função ${name} não disponível`) };
        }
        validatedResources.add(name);
      }

      const { data, error } = await (supabase as any).rpc(name, params);
      if (error) return { data: null, error: this.formatError(error) };
      
      // Fallback para tipos não-array que podem vir como boolean ou undefined
      if (data === undefined || data === null) return { data: null, error: null };
      
      return { data: data as T, error: null };
    } catch (err) {
      console.error(`[safeClient] Erro ao executar RPC ${name}:`, err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Verifica se um RPC ou Tabela existe no schema público
   */
  async validateResource(name: string, type: 'function' | 'table' = 'table'): Promise<boolean> {
    try {
      if (type === 'table') {
        // Query leve para checar existência
        const { error } = await (supabase.from(name) as any).select('count', { count: 'exact', head: true }).limit(0);
        return !error || !error.message.includes('does not exist');
      } else {
        // RPC check
        const { error } = await (supabase as any).rpc(name).limit(0);
        // Erros de parâmetros faltando significam que a função EXISTE. 
        // Apenas 'does not exist' ou similar significa ausência.
        if (!error) return true;
        const msg = error.message.toLowerCase();
        return !msg.includes('does not exist') && !msg.includes('não existe');
      }
    } catch {
      return false;
    }
  },

  /**
   * Helper para formatar erros do Supabase/Postgrest
   */
  formatError(error: PostgrestError | any): Error {
    if (error.message) {
      if (error.message.includes('does not exist')) {
        return new Error(`Recurso indisponível: ${error.message}`);
      }
      return new Error(error.message);
    }
    return new Error(String(error));
  }
};
