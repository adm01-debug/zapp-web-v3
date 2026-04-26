import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/hooks/useUserRole';

const cache = new Map<string, AppRole[] | null>();

/**
 * Fetches the configured roles for a given route path from route_permissions.
 * Returns:
 *  - undefined while loading
 *  - null if the path has no override (use code default)
 *  - AppRole[] (possibly empty = any authenticated) if configured
 */
export function useRouteRoles(path: string | undefined): AppRole[] | null | undefined {
  const [roles, setRoles] = useState<AppRole[] | null | undefined>(
    path && cache.has(path) ? cache.get(path) : undefined
  );

  useEffect(() => {
    if (!path) return;
    if (cache.has(path)) {
      setRoles(cache.get(path));
      return;
    }
    let cancelled = false;
    supabase
      .from('route_permissions')
      .select('allowed_roles')
      .eq('path', path)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          cache.set(path, null);
          setRoles(null);
        } else {
          const value = (data.allowed_roles as AppRole[]) ?? [];
          cache.set(path, value);
          setRoles(value);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return roles;
}

export function invalidateRouteRolesCache(path?: string) {
  if (path) cache.delete(path);
  else cache.clear();
}
