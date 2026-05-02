
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

// Telemetria interna
let lastValidation: Date | null = null;
const recentFailures: any[] = [];
const MAX_FAILURES = 50;
const stats = {
  totalCalls: 0,
  failedCalls: 0,
  cacheHits: 0
};

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
        
        exists = !error || !error.message || !error.message.toLowerCase().includes('does not exist');
      } else {
        const { error } = await (supabase as any).rpc(name).limit(0);
        if (!error) {
          exists = true;
        } else {
          const msg = error.message ? error.message.toLowerCase() : '';
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
   * Logger estruturado com masking de dados sensíveis
   */
  log(requestId: string, level: 'info' | 'warn' | 'error', message: string, detail?: any) {
    const prefix = `[safeClient][${requestId}]`;
    const maskedDetail = this.maskSensitiveData(detail);
    
    if (level === 'error') {
      console.error(prefix, message, maskedDetail || '');
    } else if (level === 'warn') {
      console.warn(prefix, message, maskedDetail || '');
    } else {
      console.info(prefix, message, maskedDetail || '');
    }
  },

  /**
   * Redação de dados sensíveis para logs
   */
  maskSensitiveData(data: any): any {
    if (!data) return data;
    if (typeof data !== 'object') {
      if (typeof data === 'string') {
        // Mascarar tokens e emails se detectados em strings soltas
        if (data.length > 50 || data.includes('@')) {
          return this.applyMasking(data);
        }
      }
      return data;
    }

    const masked = Array.isArray(data) ? [...data] : { ...data };
    
    for (const key in masked) {
      const val = masked[key];
      const lowerKey = key.toLowerCase();
      
      if (
        lowerKey.includes('token') || 
        lowerKey.includes('secret') || 
        lowerKey.includes('password') || 
        lowerKey.includes('key') ||
        lowerKey.includes('auth') ||
        lowerKey.includes('credential')
      ) {
        masked[key] = '***MASKED***';
      } else if (lowerKey.includes('email') && typeof val === 'string') {
        masked[key] = this.maskEmail(val);
      } else if (typeof val === 'object') {
        masked[key] = this.maskSensitiveData(val);
      }
    }
    
    return masked;
  },

  maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [user, domain] = email.split('@');
    if (user.length <= 2) return `***@${domain}`;
    return `${user.substring(0, 2)}***@${domain}`;
  },

  applyMasking(str: string): string {
    // Regex simples para capturar potenciais tokens OAuth ou JWT
    if (str.length > 30 && (str.includes('.') || /^[a-zA-Z0-9_-]+$/.test(str))) {
      return str.substring(0, 5) + '...' + str.substring(str.length - 5);
    }
    return str;
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
