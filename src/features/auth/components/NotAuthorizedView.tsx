import { Lock } from 'lucide-react';
import { GenericEmptyState } from '@/components/ui/GenericEmptyState';

interface NotAuthorizedViewProps {
  viewLabel?: string;
  message?: string;
}

/**
 * Empty state shown when the current user lacks the required role to access a view.
 * Defense layer: complements RPC/RLS guards on the backend.
 */
export function NotAuthorizedView({ viewLabel, message }: NotAuthorizedViewProps) {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <GenericEmptyState
        icon={Lock}
        title="Acesso restrito"
        description={
          message ??
          (viewLabel
            ? `Você não tem permissão para acessar "${viewLabel}". Fale com um administrador se precisar de acesso.`
            : 'Você não tem permissão para acessar este módulo. Fale com um administrador se precisar de acesso.')
        }
      />
    </div>
  );
}
