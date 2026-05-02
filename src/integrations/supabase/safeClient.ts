
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
export const safeClient = {
  /**
   * Executa uma query 'from' com tratamento de erro
   */
  async from<T = any>(
    table: string,
    queryBuilder: (query: any) => any
  ): Promise<SafeResponse<T[]>> {
    try {
      const { data, error } = await queryBuilder(supabase.from(table));
      if (error) return { data: null, error: this.formatError(error) };
      return { data: (data as T[]) || [], error: null };
    } catch (err) {
      console.error(`[safeClient] Erro ao consultar tabela ${table}:`, err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
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
      const { data, error } = await queryBuilder(supabase.from(table)).single();
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
      // Nota: Em produção, poderíamos adicionar uma validação de cache/schema aqui
      const { data, error } = await supabase.rpc(name, params);
      if (error) return { data: null, error: this.formatError(error) };
      
      // Fallback para quando o retorno vem em formato inesperado (boolean/undefined)
      if (data === undefined) return { data: null, error: null };
      
      return { data: data as T, error: null };
    } catch (err) {
      console.error(`[safeClient] Erro ao executar RPC ${name}:`, err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Helper para formatar erros do Supabase/Postgrest
   */
  formatError(error: PostgrestError | any): Error {
    if (error.message) {
      // Se for erro de coluna/tabela inexistente, damos uma mensagem mais amigável
      if (error.message.includes('does not exist')) {
        return new Error(`Recurso de banco de dados indisponível: ${error.message}`);
      }
      return new Error(error.message);
    }
    return new Error(String(error));
  }
};
