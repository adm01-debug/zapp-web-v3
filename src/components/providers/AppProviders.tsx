import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeSync } from "@/hooks/useTheme";
import { HighContrastProvider } from "@/components/theme/HighContrastToggle";
import { AccessibleToastProvider } from "@/components/ui/accessible-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { useState, useRef, useEffect } from "react";
import { getLogger } from "@/lib/logger";

const log = getLogger('AppProviders');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 1,
    },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [errorKey, setErrorKey] = useState(0);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    setErrorKey(prev => prev + 1);
    retryCountRef.current = 0;
  }, []);

  return (
    <ErrorBoundary
      resetKey={errorKey}
      onError={(error) => {
        log.error('ErrorBoundary caught:', error.message, error.stack);
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current += 1;
          log.warn(`Auto-retry ${retryCountRef.current}/${MAX_RETRIES}`);
          setTimeout(() => setErrorKey(prev => prev + 1), 2000 * retryCountRef.current);
        } else {
          log.error('Max retries reached. Manual intervention required.');
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeSync />
          <HighContrastProvider>
            <AccessibleToastProvider>
              <TooltipProvider delayDuration={300}>
                {children}
              </TooltipProvider>
            </AccessibleToastProvider>
          </HighContrastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
