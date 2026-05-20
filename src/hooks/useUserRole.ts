import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AppRole = 'admin' | 'supervisor' | 'agent' | 'special_agent';

export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [isSpecialAgent, setIsSpecialAgent] = useState(false);
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
      const userRoles = data.map(r => r.role as AppRole);
      setRoles(userRoles);
      setIsAdmin(userRoles.includes('admin'));
      setIsSupervisor(userRoles.includes('supervisor') || userRoles.includes('admin'));
      setIsSpecialAgent(userRoles.includes('special_agent'));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchRoles();
    } else {
      setRoles([]);
      setIsAdmin(false);
      setIsSupervisor(false);
      setIsSpecialAgent(false);
      setLoading(false);
    }
  }, [user, fetchRoles]);

  const hasRole = useCallback((role: AppRole) => roles.includes(role), [roles]);

  return { roles, isAdmin, isSupervisor, isSpecialAgent, hasRole, loading, refetch: fetchRoles };
}
