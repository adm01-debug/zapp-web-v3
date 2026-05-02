
import { supabase as _supabase } from './client';
import { PostgrestError } from '@supabase/supabase-js';

const supabase = _supabase as any;

/**
 * Interface para retorno padronizado do safeClient
 */
export interface SafeResponse<T> {
  data: T | null;
  error: Error | null;
  requestId?: string;
}

/**
 * Cache de recursos validados para evitar chamadas repetidas ao schema
 */
const CACHE_TTL = 300000; // 5 minutos
const resourceCache = new Map<string, { exists: boolean; expires: number }>();

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
    const requestId = Math.random().toString(36).substring(7);
    try {
      // Validação automática para tabelas gmail_*
      if (table.startsWith('gmail_')) {
        const exists = await this.validateResource(table, 'table');
        if (!exists) {
          this.log(requestId, 'warn', `Tabela ${table} não encontrada no schema.`);
          return { data: [] as T[], error: new Error(`Tabela ${table} não disponível`), requestId };
        }
      }

      const { data, error } = await queryBuilder(supabase.from(table) as any);
      if (error) {
        this.log(requestId, 'error', `Erro na query from ${table}`, error);
        return { data: [] as T[], error: this.formatError(error), requestId };
      }
      
      return { data: (Array.isArray(data) ? data : []) as T[], error: null, requestId };
    } catch (err) {
      this.log(requestId, 'error', `Erro crítico ao consultar tabela ${table}`, err);
      return { data: [] as T[], error: err instanceof Error ? err : new Error(String(err)), requestId };
    }
  },

  /**
   * Executa uma query 'from' que retorna um único item
   */
  async single<T = any>(
    table: string,
    queryBuilder: (query: any) => any
  ): Promise<SafeResponse<T>> {
    const requestId = Math.random().toString(36).substring(7);
    try {
      if (table.startsWith('gmail_')) {
        const exists = await this.validateResource(table, 'table');
        if (!exists) {
          this.log(requestId, 'warn', `Tabela ${table} não encontrada para single()`);
          return { data: null, error: new Error(`Tabela ${table} não disponível`), requestId };
        }
      }

      const { data, error } = await queryBuilder(supabase.from(table) as any).single();
      if (error) {
        this.log(requestId, 'error', `Erro single query ${table}`, error);
        return { data: null, error: this.formatError(error), requestId };
      }
      return { data: data as T, error: null, requestId };
    } catch (err) {
      this.log(requestId, 'error', `Erro crítico single ${table}`, err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)), requestId };
    }
  },

  /**
   * Executa um RPC com validação e tratamento de erro
   */
  async rpc<T = any>(
    name: string,
    params?: Record<string, any>
  ): Promise<SafeResponse<T>> {
    const requestId = Math.random().toString(36).substring(7);
    try {
      // Validação automática para RPCs rpc_gmail_*
      if (name.startsWith('rpc_gmail_')) {
        const exists = await this.validateResource(name, 'function');
        if (!exists) {
          this.log(requestId, 'warn', `RPC ${name} não encontrada no schema.`);
          return { data: null, error: new Error(`Função ${name} não disponível`), requestId };
        }
      }

      const { data, error } = await (supabase as any).rpc(name, params);
      if (error) {
        this.log(requestId, 'error', `Erro ao executar RPC ${name}`, error);
        return { data: null, error: this.formatError(error), requestId };
      }
      
      if (data === undefined || data === null) return { data: null, error: null, requestId };
      
      return { data: data as T, error: null, requestId };
    } catch (err) {
      this.log(requestId, 'error', `Erro crítico RPC ${name}`, err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)), requestId };
    }
  },

  /**
   * Verifica se um RPC ou Tabela existe no schema público com cache
   */
  async validateResource(name: string, type: 'function' | 'table' = 'table'): Promise<boolean> {
    const cacheKey = `${type}:${name}`;
    const cached = resourceCache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      return cached.exists;
    }

    try {
      let exists = false;
      if (type === 'table') {
        const { error } = await (supabase.from(name) as any).select('count', { count: 'exact', head: true }).limit(0);
        exists = !error || !error.message.toLowerCase().includes('does not exist');
      } else {
        const { error } = await (supabase as any).rpc(name).limit(0);
        if (!error) {
          exists = true;
        } else {
          const msg = error.message.toLowerCase();
          exists = !msg.includes('does not exist') && !msg.includes('não existe');
        }
      }
      
      resourceCache.set(cacheKey, { exists, expires: Date.now() + CACHE_TTL });
      return exists;
    } catch {
      return false;
    }
  },

  /**
   * Logger estruturado
   */
  log(requestId: string, level: 'info' | 'warn' | 'error', message: string, detail?: any) {
    const prefix = `[safeClient][${requestId}]`;
    if (level === 'error') {
      console.error(prefix, message, detail || '');
    } else if (level === 'warn') {
      console.warn(prefix, message, detail || '');
    } else {
      console.log(prefix, message, detail || '');
    }
  },

  /**
   * Helper para formatar erros do Supabase/Postgrest
   */
  formatError(error: PostgrestError | any): Error {
    if (error.message) {
      if (error.message.toLowerCase().includes('does not exist')) {
        return new Error(`Recurso indisponível: ${error.message}`);
      }
      return new Error(error.message);
    }
    return new Error(String(error));
  }
};
