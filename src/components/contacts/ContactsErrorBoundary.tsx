/**
 * ContactsErrorBoundary.tsx
 * React Error Boundary wrapping the entire Contacts module.
 * Catches rendering errors, logs them, and shows a recovery UI.
 *
 * OWASP: Error handling must never expose stack traces to users.
 * We log details internally and show a generic recovery message.
 */
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface Props {
  children:          ReactNode;
  fallbackTitle?:    string;
  onReset?:          () => void;
}

interface State {
  hasError:    boolean;
  errorId:     string | null;
}

// ── Component ──────────────────────────────────────────────────────────────

export class ContactsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorId: null };
  }

  static getDerivedStateFromError(_: Error): Partial<State> {
    // Generate a reference ID for support logs (no actual error data exposed)
    const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`;
    return { hasError: true, errorId };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console (will be captured by error tracking in production)
    // We intentionally do NOT expose this to the user
    console.error('[ContactsErrorBoundary] Caught error:', {
      message:   error.message,
      name:      error.name,
      component: info.componentStack?.split('\n')[1]?.trim() ?? 'unknown',
      errorId:   this.state.errorId,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, errorId: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center space-y-4"
        >
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-semibold">
              {this.props.fallbackTitle ?? 'Algo deu errado nos Contatos'}
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Ocorreu um erro inesperado. Tente recarregar o módulo. Se o problema persistir, entre em contato com o suporte.
            </p>
            {this.state.errorId && (
              <p className="text-xs text-muted-foreground/60 font-mono mt-2">
                Ref: {this.state.errorId}
              </p>
            )}
          </div>

          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              onClick={this.handleReset}
              className="gap-2"
              aria-label="Tentar novamente"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Tentar novamente
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.location.reload()}
              className="gap-2"
              aria-label="Recarregar página"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Recarregar página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for easier composition.
 * Usage: <ContactsErrorBoundaryWrapper><ContactsView /></ContactsErrorBoundaryWrapper>
 */
export const ContactsErrorBoundaryWrapper: React.FC<{
  children: ReactNode;
  onReset?: () => void;
}> = ({ children, onReset }) => (
  <ContactsErrorBoundary onReset={onReset}>
    {children}
  </ContactsErrorBoundary>
);

export default ContactsErrorBoundary;
