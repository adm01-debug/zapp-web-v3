import { ReactNode, useEffect, useState } from 'react';
import { getLogger } from '@/lib/logger';

const log = getLogger('ProtectedRoute');
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: ('admin' | 'supervisor' | 'agent')[];
  requiredPermission?: string;
  fallback?: ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredRoles,
  requiredPermission,
  fallback 
}: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { roles, loading: rolesLoading, hasRole } = useUserRole();
  const location = useLocation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

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
          <p className="text-foreground font-medium">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check required roles
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => hasRole(role));
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
