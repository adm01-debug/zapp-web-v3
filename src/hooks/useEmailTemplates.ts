/**
 * useEmailTemplates.ts — Gerencia templates de email (respostas rápidas)
 *
 * Templates são "canned responses" que o agente pode inserir rapidamente
 * via atalho de teclado (/obrigado, /info, /resolvido) ou dropdown.
 *
 * Suporte:
 * - CRUD de templates pessoais e compartilhados
 * - Busca por atalho (/shortcut)
 * - Categorias (atendimento, interno, comercial)
 * - Contagem de uso para ranking
 * - Templates compartilhados com equipe
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase = _supabase as any;

export interface EmailTemplate {
  id:         string;
  user_id:    string;
  name:       string;
  subject:    string | null;
  body_html:  string;
  category:   string;
  shortcut:   string | null;
  use_count:  number;
  is_shared:  boolean;
  tags:       string[];
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateParams {
  name:       string;
  subject?:   string;
  body_html:  string;
  category?:  string;
  shortcut?:  string;
  is_shared?: boolean;
  tags?:      string[];
}

export function useEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Carregar todos os templates (pessoais + compartilhados)
  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error: dbErr } = await supabase
        .from('email_templates')
        .select('*')
        .order('use_count', { ascending: false }); // Mais usados primeiro

      if (dbErr) throw new Error(dbErr.message);
      setTemplates((data ?? []) as EmailTemplate[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // Criar template
  const createTemplate = useCallback(async (params: CreateTemplateParams) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Não autenticado' };

    const { data, error: dbErr } = await supabase
      .from('email_templates')
      .insert({
        user_id:   user.id,
        name:      params.name,
        subject:   params.subject ?? null,
        body_html: params.body_html,
        category:  params.category ?? 'geral',
        shortcut:  params.shortcut ?? null,
        is_shared: params.is_shared ?? false,
        tags:      params.tags ?? [],
      })
      .select()
      .single();

    if (dbErr) return { success: false, error: dbErr.message };
    setTemplates(prev => [data as EmailTemplate, ...prev]);
    return { success: true, template: data };
  }, []);

  // Atualizar template
  const updateTemplate = useCallback(async (id: string, updates: Partial<CreateTemplateParams>) => {
    const { error: dbErr } = await supabase
      .from('email_templates')
      .update(updates)
      .eq('id', id);

    if (dbErr) return { success: false, error: dbErr.message };
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } as EmailTemplate : t));
    return { success: true };
  }, []);

  // Deletar template
  const deleteTemplate = useCallback(async (id: string) => {
    const { error: dbErr } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id);

    if (!dbErr) setTemplates(prev => prev.filter(t => t.id !== id));
    return { success: !dbErr };
  }, []);

  // Buscar template por shortcut (ex: "/obrigado")
  const getByShortcut = useCallback(async (shortcut: string): Promise<EmailTemplate | null> => {
    const { data } = await supabase.rpc('rpc_email_template_by_shortcut', { p_shortcut: shortcut });
    return data as EmailTemplate | null;
  }, []);

  // Registrar uso (incrementa use_count)
  const useTemplate = useCallback(async (id: string) => {
    await supabase.rpc('rpc_email_template_use', { p_template_id: id });
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, use_count: t.use_count + 1 } : t));
  }, []);

  // Detectar shortcut no texto digitado (para auto-complete)
  const detectShortcut = useCallback((text: string): EmailTemplate | undefined => {
    if (!text.startsWith('/')) return undefined;
    const cmd = text.trim().toLowerCase();
    return templates.find(t => t.shortcut?.toLowerCase() === cmd);
  }, [templates]);

  // Filtrar por categoria
  const byCategory = useCallback((category: string): EmailTemplate[] => {
    return templates.filter(t => t.category === category);
  }, [templates]);

  // Categorias únicas
  const categories = [...new Set(templates.map(t => t.category))].sort();

  // Templates pessoais vs compartilhados
  const personalTemplates = templates.filter(t => !t.is_shared);
  const sharedTemplates   = templates.filter(t => t.is_shared);

  return {
    templates,
    personalTemplates,
    sharedTemplates,
    categories,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getByShortcut,
    useTemplate,
    detectShortcut,
    byCategory,
    refresh: loadTemplates,
  };
}
