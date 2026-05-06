import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Retorna os IDs (profiles.id) de todos os colaboradores do mesmo
 * departamento do usuário logado, incluindo o próprio usuário.
 *
 * Usado para escopo "Departamento" no Inbox (supervisor / coordenador
 * vê as conversas atribuídas a si E aos demais colaboradores do
 * próprio departamento).
 */
export function useDepartmentAgents() {
  const { profile } = useAuth();
  const departmentId = profile?.department_id ?? null;

  const query = useQuery({
    queryKey: ['department-agents', departmentId],
    enabled: !!departmentId,
    staleTime: 60_000,
    queryFn: async (): Promise<string[]> => {
      if (!departmentId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('department_id', departmentId);
      if (error) throw error;
      return (data ?? []).map((r) => r.id as string);
    },
  });

  const ids = query.data ?? (profile?.id ? [profile.id] : []);
  return {
    agentIds: ids,
    departmentId,
    loading: query.isLoading,
  };
}
