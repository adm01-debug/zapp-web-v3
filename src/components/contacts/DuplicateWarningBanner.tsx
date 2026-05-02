/**
 * DuplicateWarningBanner.tsx
 * Inline warning shown in ContactForm when a potential duplicate is detected.
 * Gives the user a choice: ignore or open merge dialog.
 */
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, GitMerge, X, User } from 'lucide-react';
import { sanitizeText } from '@/lib/sanitize';
import type { PotentialDuplicate } from './useContactDuplicateDetector';

interface DuplicateWarningBannerProps {
  duplicates:       PotentialDuplicate[];
  checking:         boolean;
  onMerge?:         (dup: PotentialDuplicate) => void;
  onDismiss?:       () => void;
  className?:       string;
}

export const DuplicateWarningBanner: React.FC<DuplicateWarningBannerProps> = ({
  duplicates,
  checking,
  onMerge,
  onDismiss,
  className,
}) => {
  if (checking) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1 animate-pulse">
        <div className="h-3 w-3 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
        Verificando duplicatas...
      </div>
    );
  }

  if (duplicates.length === 0) return null;

  const matchLabels: Record<string, string> = {
    phone: 'mesmo telefone',
    email: 'mesmo e-mail',
    name:  'nome similar',
  };

  return (
    <Alert
      variant="default"
      className={`border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 ${className ?? ''}`}
      role="alert"
      aria-live="polite"
    >
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
      <AlertDescription className="ml-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="font-medium text-sm text-amber-800 dark:text-amber-200">
              {duplicates.length === 1
                ? 'Possível contato duplicado encontrado'
                : `${duplicates.length} possíveis duplicatas encontradas`}
            </p>
            <div className="space-y-1.5 mt-2">
              {duplicates.map((dup) => (
                <div
                  key={dup.id}
                  className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300"
                >
                  <User className="h-3 w-3 shrink-0" />
                  <span className="font-medium">{sanitizeText(dup.name)}</span>
                  {dup.phone && <span className="text-muted-foreground">{sanitizeText(dup.phone)}</span>}
                  <Badge
                    variant="outline"
                    className="text-xs py-0 px-1 border-amber-400 text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/50"
                  >
                    {matchLabels[dup.match_field] ?? dup.match_field}
                  </Badge>

                  {onMerge && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onMerge(dup)}
                      className="h-5 text-xs py-0 px-2 border-amber-400 text-amber-700 hover:bg-amber-100 ml-auto shrink-0"
                    >
                      <GitMerge className="h-3 w-3 mr-1" />
                      Mesclar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-amber-600 hover:text-amber-800 transition-colors shrink-0"
              aria-label="Fechar aviso de duplicata"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default DuplicateWarningBanner;
