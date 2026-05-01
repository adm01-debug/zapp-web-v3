import { ReactNode, useEffect, useState } from 'react';
import { getLogger } from '@/lib/logger';

const log = getLogger('ProtectedRoute');
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth, useUserRole, useRouteRoles, type AppRole } from '@/features/hooks';

import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: AppRole[];
  requiredPermission?: string;
  fallback?: ReactNode;
  /** Override the path used to look up dynamic role overrides. Defaults to location.pathname. */
  routePath?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRoles,
  requiredPermission,
  fallback,
  routePath,
}: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { roles, loading: rolesLoading, hasRole } = useUserRole();
  const location = useLocation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Dynamic override from route_permissions table.
  // Non-blocking: returns null until fetch resolves, so we never delay render.
  const overrideRoles = useRouteRoles(routePath ?? location.pathname);

  const loading = authLoading || rolesLoading;

  useEffect(() => {
    if (!loading && user && requiredPermission) {
      supabase.rpc('user_has_permission', {
        _user_id: user.id,
        _permission_name: requiredPermission
      }).then(({ data, error }) => {
        if (error) {
          log.error('Permission check failed:', error.message);
          setHasPermission(false);
          return;
        }
        setHasPermission(data === true);
      });
    } else if (!requiredPermission) {
      setHasPermission(true);
    }
  }, [loading, user, requiredPermission]);

  if (loading || (requiredPermission && hasPermission === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-busy="true" aria-label="Verificando acesso">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Resolve effective required roles: DB override wins when present
  // overrideRoles === null  -> no override, use code default
  // overrideRoles === []    -> any authenticated user
  // overrideRoles === [...] -> explicit list
  const effectiveRoles: AppRole[] | undefined =
    overrideRoles === null ? requiredRoles : overrideRoles;

  if (effectiveRoles && effectiveRoles.length > 0) {
    // 'dev' always has access
    const hasRequiredRole = hasRole('dev' as AppRole) || effectiveRoles.some(role => hasRole(role));
    if (!hasRequiredRole) {
      if (fallback) return <>{fallback}</>;
      return <Navigate to="/" replace />;
    }
  }

  // Check required permission
  if (requiredPermission && !hasPermission) {
    if (fallback) return <>{fallback}</>;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Higher-order component for permission-based rendering
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: string
) {
  return function PermissionWrapper(props: P) {
    return (
      <ProtectedRoute requiredPermission={permission}>
        <WrappedComponent {...props} />
      </ProtectedRoute>
    );
  };
}
