import { lazy, Suspense, useEffect, useState, forwardRef } from "react";
import { BrowserRouter } from "react-router-dom";
import { getLogger } from "@/lib/logger";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { GlobalKeyboardProvider } from "@/components/keyboard/GlobalKeyboardProvider";
import { SkipLinks } from "@/components/ui/skip-link";
import { LiveRegion } from "@/components/ui/visually-hidden";
import { ThemeInitializer } from "@/components/ThemeInitializer";
import { AppProviders } from "@/components/providers/AppProviders";
import { AppRoutes } from "@/components/routing/AppRoutes";

const log = getLogger('App');

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

/** Deferred hooks component — lazy-loaded so hooks don't run until after first paint */
const DeferredHooks = lazy(() =>
  import('@/hooks/useServiceWorker').then(swMod =>
    import('@/features/auth').then(spMod => ({
      default: forwardRef(function DeferredHooksInner(_props: Record<string, never>, _ref: React.ForwardedRef<unknown>) {
        swMod.useServiceWorker();
        spMod.useScreenProtection();
        return null;
      })
    }))
  )
);

function AppContent() {
  const [deferredReady, setDeferredReady] = useState(false);

  // Defer non-critical features to after first paint
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setTimeout(() => setDeferredReady(true), 800);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Global error handlers
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
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
        <AppRoutes />
      </GlobalKeyboardProvider>
    </BrowserRouter>
  );
}

const App = () => (
  <AppProviders>
    <AppContent />
  </AppProviders>
);

export default App;



