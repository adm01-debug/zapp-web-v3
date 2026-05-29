import { useCallback, useState, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

export interface RolePermission {
  role: 'dev' | 'admin' | 'supervisor' | 'agent';
  permission_id: string;
  permission?: Permission;
}

export function usePermissions() {
  const { user, permissions: userPermissions, loading: authLoading, refreshPermissions } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [fetchingAll, setFetchingAll] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchAllPermissionsData = useCallback(async () => {
    if (fetchingAll || !mountedRef.current) return;
    setFetchingAll(true);
    
    try {
      const [permsResult, rolePermsResult] = await Promise.all([
        supabase.from('permissions').select('*').order('category', { ascending: true }),
        supabase.from('role_permissions').select('role, permission_id, permissions(id, name, description, category)')
      ]);

      if (mountedRef.current) {
        if (permsResult.data) setPermissions(permsResult.data as Permission[]);
        if (rolePermsResult.data) {
          const mapped = rolePermsResult.data.map(rp => ({
            role: rp.role as 'dev' | 'admin' | 'supervisor' | 'agent',
            permission_id: rp.permission_id,
            permission: rp.permissions as unknown as Permission
          }));
          setRolePermissions(mapped);
        }
      }
    } finally {
      if (mountedRef.current) setFetchingAll(false);
    }
  }, [fetchingAll]);

  useEffect(() => {
    if (user) {
      fetchAllPermissionsData();
    }
  }, [user, fetchAllPermissionsData]);

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

  const addPermissionToRole = useCallback(async (role: string, permissionId: string) => {
    const { error } = await supabase
      .from('role_permissions')
      .insert({ role, permission_id: permissionId } as any);

    if (!error) {
      await Promise.all([refreshPermissions(), fetchAllPermissionsData()]);
    }
    return !error;
  }, [refreshPermissions, fetchAllPermissionsData]);

  const removePermissionFromRole = useCallback(async (role: string, permissionId: string) => {
    const { error } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role', role as any)
      .eq('permission_id', permissionId);

    if (!error) {
      await Promise.all([refreshPermissions(), fetchAllPermissionsData()]);
    }
    return !error;
  }, [refreshPermissions, fetchAllPermissionsData]);

  return {
    permissions,
    rolePermissions,
    userPermissions,
    loading: authLoading || fetchingAll,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    checkPermissionServer,
    addPermissionToRole,
    removePermissionFromRole,
    refetch: () => Promise.all([refreshPermissions(), fetchAllPermissionsData()])
  };
}
