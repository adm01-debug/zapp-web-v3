import { lazy, Suspense, useEffect, useState, useRef, forwardRef } from "react";
import { getLogger } from "@/lib/logger";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { GlobalKeyboardProvider } from "@/components/keyboard/GlobalKeyboardProvider";
import { AccessibleToastProvider } from "@/components/ui/accessible-toast";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { SkipLinks } from "@/components/ui/skip-link";
import { LiveRegion } from "@/components/ui/visually-hidden";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";
import { HighContrastProvider } from "@/components/theme/HighContrastToggle";
import { ThemeSync } from "@/hooks/useTheme";
import { ThemeInitializer } from "@/components/ThemeInitializer";

// Deferred non-critical providers loaded after first paint
const RealtimeSentimentAlertProvider = lazy(() => import("@/components/notifications/RealtimeSentimentAlertProvider").then(m => ({ default: m.RealtimeSentimentAlertProvider })));
const IncomingCallAlert = lazy(() => import("@/components/calls/IncomingCallAlert").then(m => ({ default: m.IncomingCallAlert })));
const EasterEggsProvider = lazy(() => import("@/components/effects/EasterEggs").then(m => ({ default: m.EasterEggsProvider })));
const InAppNotificationProvider = lazy(() => import("@/components/mobile/InAppNotificationProvider").then(m => ({ default: m.InAppNotificationProvider })));

function DeferredProviders({ children }: { children?: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <RealtimeSentimentAlertProvider />
      <IncomingCallAlert />
      <InAppNotificationProvider>
        <EasterEggsProvider>{children ?? null}</EasterEggsProvider>
      </InAppNotificationProvider>
    </Suspense>
  );
}

// Retry wrapper for lazy imports to handle transient network failures
function lazyWithRetry(factory: () => Promise<any>, retries = 3): React.LazyExoticComponent<any> {
  return lazy(() => {
    let attempt = 0;
    const load = (): Promise<any> =>
      factory().catch((err: unknown) => {
        attempt++;
        if (attempt < retries) {
          return new Promise(r => setTimeout(r, 1000 * attempt)).then(load);
        }
        throw err;
      });
    return load();
  });
}

// Lazy-load ALL page routes for optimal initial bundle
const Index = lazyWithRetry(() => import("./pages/Index"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
import NotFound from "./pages/NotFound";

const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const VerifyEmail = lazyWithRetry(() => import("./pages/VerifyEmail"));
const SSOCallback = lazyWithRetry(() => import("./pages/SSOCallback"));
const TwoFactorAuth = lazyWithRetry(() => import("./pages/TwoFactorAuth"));
const QueueDetails = lazyWithRetry(() => import("./pages/QueueDetails"));
const QueuesComparison = lazyWithRetry(() => import("./pages/QueuesComparison"));
const SLADashboard = lazyWithRetry(() => import("./pages/SLADashboard"));
const SLAHistory = lazyWithRetry(() => import("./pages/SLAHistory"));
const SLAAlertPreferences = lazyWithRetry(() => import("./pages/SLAAlertPreferences"));
const SLAAlertHistory = lazyWithRetry(() => import("./pages/SLAAlertHistory"));
const SendStatusBusDebug = lazyWithRetry(() => import("./pages/SendStatusBusDebug"));
const RealtimeFanoutDebug = lazyWithRetry(() => import("./pages/RealtimeFanoutDebug"));
const RolesPage = lazyWithRetry(() => import("./pages/admin/RolesPage"));
const DepartmentsPage = lazyWithRetry(() => import("./pages/admin/DepartmentsPage"));
const RateLimitDashboard = lazyWithRetry(() => import("./pages/admin/RateLimitDashboard"));
const HmacSelfTestPage = lazyWithRetry(() => import("./pages/admin/HmacSelfTestPage"));
const AdminChannelsPage = lazyWithRetry(() => import("./pages/admin/AdminChannelsPage"));
const AdminQueuesPage = lazyWithRetry(() => import("./pages/admin/AdminQueuesPage"));
const AdminOperationsPage = lazyWithRetry(() => import("./pages/admin/AdminOperationsPage"));
const AdminProvidersPage = lazyWithRetry(() => import("./pages/admin/AdminProvidersPage"));
const AdminFailedAuthMessagesPage = lazyWithRetry(() => import("./pages/admin/AdminFailedAuthMessagesPage"));
const RoutePermissionsPage = lazyWithRetry(() => import("./pages/admin/RoutePermissionsPage"));
const AdminStressTestPage = lazyWithRetry(() => import("./pages/admin/AdminStressTestPage"));
const AdminInboxSyncStatusPage = lazyWithRetry(() => import("./pages/admin/AdminInboxSyncStatusPage"));
const AdminAutomationsPage = lazyWithRetry(() => import("./pages/admin/AdminAutomationsPage"));
const AdminAutomationLogsPage = lazyWithRetry(() => import("./pages/admin/AdminAutomationLogsPage"));
const AdminWhatsAppModePage = lazyWithRetry(() => import("./pages/admin/AdminWhatsAppModePage"));
const Install = lazyWithRetry(() => import("./pages/Install"));
const ChatPopup = lazyWithRetry(() => import("./pages/ChatPopup"));

// Route loading fallback component
function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-background" role="status" aria-busy="true" aria-label="Carregando página">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto animate-pulse">
          <Sparkles className="w-8 h-8 text-primary" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-3 w-24 mx-auto" />
        </div>
        <span className="sr-only">Carregando página...</span>
      </div>
    </div>
  );
}

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

const log = getLogger('App');

function AppContent() {
  const [deferredReady, setDeferredReady] = useState(false);

  // Defer non-critical features to after first paint
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setTimeout(() => setDeferredReady(true), 800);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Global unhandled rejection handler
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      // Silence harmless View Transition API aborts (rapid navigation)
      const reason = event.reason;
      if (reason && typeof reason === 'object' && 'name' in reason) {
        const name = (reason as { name: string }).name;
        if (name === 'TimeoutError' || name === 'InvalidStateError') {
          event.preventDefault();
          return;
        }
      }
      log.error("Unhandled promise rejection:", event.reason);
      event.preventDefault();
    };
    const errorHandler = (event: ErrorEvent) => {
      log.error("Uncaught error:", event.error);
    };
    window.addEventListener("unhandledrejection", handler);
    window.addEventListener("error", errorHandler);
    return () => {
      window.removeEventListener("unhandledrejection", handler);
      window.removeEventListener("error", errorHandler);
    };
  }, []);

  return (
    <BrowserRouter>
      <ThemeInitializer />
      <SkipLinks />
      <LiveRegion />
      <GlobalKeyboardProvider>
        {deferredReady && <DeferredProviders />}
        {deferredReady && <Suspense fallback={null}><DeferredHooks /></Suspense>}
        <Toaster />
        <Sonner />
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/auth/callback" element={<SSOCallback />} />
            <Route path="/2fa" element={<TwoFactorAuth />} />
            <Route path="/install" element={<Install />} />
            <Route path="/chat-popup/:contactId" element={<ProtectedRoute><ChatPopup /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/queue/:id" element={<ProtectedRoute><QueueDetails /></ProtectedRoute>} />
            <Route path="/queues/comparison" element={<ProtectedRoute><QueuesComparison /></ProtectedRoute>} />
            <Route path="/sla" element={<ProtectedRoute><SLADashboard /></ProtectedRoute>} />
            <Route path="/sla/history" element={<ProtectedRoute><SLAHistory /></ProtectedRoute>} />
            <Route path="/sla/preferences" element={<ProtectedRoute><SLAAlertPreferences /></ProtectedRoute>} />
            <Route path="/sla/alerts" element={<ProtectedRoute><SLAAlertHistory /></ProtectedRoute>} />
            <Route path="/debug/send-status-bus" element={<ProtectedRoute><SendStatusBusDebug /></ProtectedRoute>} />
            <Route path="/debug/realtime-fanout" element={<ProtectedRoute><RealtimeFanoutDebug /></ProtectedRoute>} />
            <Route path="/admin/roles" element={<ProtectedRoute requiredRoles={['admin']}><RolesPage /></ProtectedRoute>} />
            <Route path="/admin/departments" element={<ProtectedRoute requiredRoles={['admin']}><DepartmentsPage /></ProtectedRoute>} />
            <Route path="/admin/departamentos" element={<ProtectedRoute requiredRoles={['admin']}><DepartmentsPage /></ProtectedRoute>} />
            <Route path="/admin/rate-limit" element={<ProtectedRoute requiredRoles={['admin']}><RateLimitDashboard /></ProtectedRoute>} />
            <Route path="/admin/hmac-selftest" element={<ProtectedRoute requiredRoles={['admin', 'supervisor']}><HmacSelfTestPage /></ProtectedRoute>} />
            <Route path="/admin/operations" element={<ProtectedRoute requiredRoles={['admin', 'supervisor']}><AdminOperationsPage /></ProtectedRoute>} />
            <Route path="/admin/channels" element={<ProtectedRoute requiredRoles={['admin', 'supervisor']}><AdminChannelsPage /></ProtectedRoute>} />
            <Route path="/admin/queues" element={<ProtectedRoute requiredRoles={['admin', 'supervisor']}><AdminQueuesPage /></ProtectedRoute>} />
            <Route path="/admin/providers" element={<ProtectedRoute requiredRoles={['admin', 'supervisor']}><AdminProvidersPage /></ProtectedRoute>} />
            <Route path="/admin/failed-auth-messages" element={<ProtectedRoute requiredRoles={['admin']}><AdminFailedAuthMessagesPage /></ProtectedRoute>} />
            <Route path="/admin/route-permissions" element={<ProtectedRoute requiredRoles={['admin']}><RoutePermissionsPage /></ProtectedRoute>} />
            <Route path="/admin/stress-test" element={<ProtectedRoute requiredRoles={['admin']}><AdminStressTestPage /></ProtectedRoute>} />
            <Route path="/admin/inbox-sync-status" element={<ProtectedRoute requiredRoles={['admin', 'supervisor']}><AdminInboxSyncStatusPage /></ProtectedRoute>} />
            <Route path="/admin/automations" element={<ProtectedRoute requiredRoles={['admin', 'supervisor']}><AdminAutomationsPage /></ProtectedRoute>} />
            <Route path="/admin/automations/logs" element={<ProtectedRoute requiredRoles={['admin', 'supervisor']}><AdminAutomationLogsPage /></ProtectedRoute>} />
            <Route path="/admin/whatsapp-mode" element={<ProtectedRoute requiredRoles={['admin', 'supervisor']}><AdminWhatsAppModePage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </GlobalKeyboardProvider>
    </BrowserRouter>
  );
}

/** Deferred hooks component — lazy-loaded so hooks don't run until after first paint */
const DeferredHooks = lazy(() =>
  import('@/hooks/useServiceWorker').then(swMod =>
    import('@/hooks/useScreenProtection').then(spMod => ({
      default: forwardRef(function DeferredHooksInner(_props: Record<string, never>, _ref: React.ForwardedRef<unknown>) {
        swMod.useServiceWorker();
        spMod.useScreenProtection();
        return null;
      })
    }))
  )
);

function AppWithErrorRecovery() {
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
                <AppContent />
              </TooltipProvider>
            </AccessibleToastProvider>
          </HighContrastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const App = () => <AppWithErrorRecovery />;

export default App;


