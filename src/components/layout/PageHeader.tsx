import { ChevronLeft, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Contextual page header with breadcrumbs and quick actions
 * Provides wayfinding and navigation context
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumbs = [],
  showBack = false,
  onBack,
  actions,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const _location = useLocation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={cn('flex flex-col gap-2 border-b border-border/50 bg-card px-6 py-4', className)}
    >
      {/* Breadcrumbs row */}
      {breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href="/"
                className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Home className="h-3.5 w-3.5" />
                <span className="sr-only">Início</span>
              </BreadcrumbLink>
            </BreadcrumbItem>

            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;

              return (
                <BreadcrumbItem key={crumb.label}>
                  <BreadcrumbSeparator />
                  {isLast ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      href={crumb.href}
                      onClick={(e) => {
                        if (crumb.onClick) {
                          e.preventDefault();
                          crumb.onClick();
                        }
                      }}
                      className="transition-colors hover:text-foreground"
                    >
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {/* Title row with actions */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-8 w-8 shrink-0"
              aria-label="Voltar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}

          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>

        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
