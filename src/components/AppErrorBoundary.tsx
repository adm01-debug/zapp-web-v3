import { Component, ErrorInfo, ReactNode } from 'react';
import { log } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
  /** Module name for error tracking (e.g., 'inbox', 'crm', 'voip') */
  module?: string;
  /** Custom fallback UI */
  fallback?: ReactNode;
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

/**
 * Production-grade Error Boundary for ZAPP WEB.
 *
 * Features:
 * - Catches render errors in any child component tree
 * - Logs errors to Supabase `app_error_logs` table for monitoring
 * - Shows a user-friendly fallback with error ID for support
 * - Supports per-module boundaries (inbox, crm, voip, etc.)
 * - Auto-recovery button to retry rendering
 * - Reports error context: module, component stack, user agent
 */
export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`;
    return { hasError: true, error, errorId };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { module = 'unknown', onError } = this.props;
    const { errorId } = this.state;

    // Log to console in development
    log.error(`[${module}] Unhandled render error (${errorId}):`, error);

    // Report to Supabase for production monitoring
    this.reportError(error, errorInfo, errorId);

    // Call custom handler if provided
    onError?.(error, errorInfo);
  }

  private async reportError(error: Error, errorInfo: ErrorInfo, errorId: string | null) {
    try {
      await supabase.from('app_error_logs').insert({
        error_id: errorId,
        module: this.props.module || 'unknown',
        message: error.message,
        stack: error.stack?.slice(0, 2000), // Truncate to avoid huge payloads
        component_stack: errorInfo.componentStack?.slice(0, 2000),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        url: typeof window !== 'undefined' ? window.location.href : null,
        timestamp: new Date().toISOString(),
      });
    } catch (reportError) {
      // Silently fail — we don't want error reporting to cause more errors
      log.error('Failed to report error to Supabase:', reportError);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorId: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px] bg-background border rounded-lg m-4">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Algo deu errado
          </h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            Ocorreu um erro inesperado neste módulo. Tente recarregar ou entre em contato com o suporte.
          </p>
          {this.state.errorId && (
            <p className="text-xs text-muted-foreground mb-4 font-mono">
              ID: {this.state.errorId}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Tentar novamente
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/90 transition-colors"
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
