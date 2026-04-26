import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hierarquia de papéis (do mais alto ao mais baixo):
 *
 *   dev        → Equipe técnica. Acesso TOTAL inclusive edição de áreas técnicas
 *                (telemetria, webhook, banco, infra) e informativos do sistema.
 *   admin      → Gestão completa do negócio (pessoas, integrações, configurações).
 *                Vê áreas técnicas em modo leitura. Não edita áreas técnicas.
 *   manager    → Gestor geral. Vê TUDO da empresa em todos os departamentos
 *                (inbox, CRM, relatórios) mas NÃO gerencia usuários nem configurações.
 *   supervisor → Supervisor de DEPARTAMENTO. Vê apenas conversas/contatos do
 *                próprio departamento (dele + agentes do mesmo departamento).
 *   agent      → Atendente final. Apenas o próprio escopo.
 *
 * Cada nível superior herda os acessos dos níveis abaixo.
 */
export type AppRole = 'dev' | 'admin' | 'manager' | 'supervisor' | 'agent';

const ROLE_RANK: Record<AppRole, number> = {
  dev: 5,
  admin: 4,
  manager: 3,
  supervisor: 2,
  agent: 1,
};

export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDev, setIsDev] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchRoles = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id);

    if (!mountedRef.current) return;

    if (!error && data) {
      // Normaliza papéis legados (special_agent foi descontinuado → vira agent).
      const userRoles = data.map((r) => {
        const raw = r.role as string;
        return (raw === 'special_agent' ? 'agent' : raw) as AppRole;
      });
      setRoles(userRoles);

      const maxRank = userRoles.reduce(
        (acc, r) => Math.max(acc, ROLE_RANK[r] ?? 0),
        0
      );
      // Hierárquico: cada nível concede os abaixo.
      setIsDev(maxRank >= ROLE_RANK.dev);
      setIsAdmin(maxRank >= ROLE_RANK.admin);
      setIsManager(maxRank >= ROLE_RANK.manager);
      setIsSupervisor(maxRank >= ROLE_RANK.supervisor);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchRoles();
    } else {
      setRoles([]);
      setIsDev(false);
      setIsAdmin(false);
      setIsManager(false);
      setIsSupervisor(false);
      setLoading(false);
    }
  }, [user, fetchRoles]);

  const hasRole = useCallback(
    (role: AppRole) => {
      const required = ROLE_RANK[role] ?? 0;
      return roles.some((r) => (ROLE_RANK[r] ?? 0) >= required);
    },
    [roles]
  );

  return {
    roles,
    isDev,
    isAdmin,
    isManager,
    isSupervisor,
    /** @deprecated O papel `special_agent` foi descontinuado. Sempre retorna `false`. */
    isSpecialAgent: false,
    hasRole,
    loading,
    refetch: fetchRoles,
  };
}
