import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export function usePermissions() {
  const { user, permissions: userPermissions, loading, refreshPermissions } = useAuth();

  /** Server-side permission check via SECURITY DEFINER RPC */
  const checkPermissionServer = useCallback(async (permissionName: string): Promise<boolean> => {
    if (!user) return false;
    const { data, error } = await supabase.rpc('user_has_permission', {
      _user_id: user.id,
      _permission_name: permissionName,
    });
    if (error) return false;
    return !!data;
  }, [user]);

  const hasPermission = useCallback((permissionName: string): boolean => {
    return userPermissions.includes(permissionName);
  }, [userPermissions]);

  const hasAnyPermission = useCallback((permissionNames: string[]): boolean => {
    return permissionNames.some(p => userPermissions.includes(p));
  }, [userPermissions]);

  const hasAllPermissions = useCallback((permissionNames: string[]): boolean => {
    return permissionNames.every(p => userPermissions.includes(p));
  }, [userPermissions]);

  // Note: addPermissionToRole and removePermissionFromRole still need direct Supabase calls
  // but they are rarely used in the main flow.
  const addPermissionToRole = useCallback(async (role: string, permissionId: string) => {
    const { error } = await supabase
      .from('role_permissions')
      .insert({ role, permission_id: permissionId } as any);

    if (!error) {
      await refreshPermissions();
    }
    return !error;
  }, [refreshPermissions]);

  const removePermissionFromRole = useCallback(async (role: string, permissionId: string) => {
    const { error } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role', role as any)
      .eq('permission_id', permissionId);

    if (!error) {
      await refreshPermissions();
    }
    return !error;
  }, [refreshPermissions]);

  return {
    userPermissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    checkPermissionServer,
    addPermissionToRole,
    removePermissionFromRole,
    refetch: refreshPermissions
  };
}
