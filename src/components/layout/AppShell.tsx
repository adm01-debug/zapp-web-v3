
import { Suspense, useCallback, forwardRef, lazy, useState, useMemo, memo } from 'react';
import { Target, Mic, Minimize2, Info } from 'lucide-react';
import { useViewTransition } from '@/hooks/useViewTransition';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/layout/Sidebar';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { ViewRouter } from '@/pages/ViewRouter';
import { ViewLoadingFallback } from '@/components/layout/ViewLoadingFallback';
import { RouteLoadingBar } from '@/components/ui/route-loading-bar';
import { FailedMessageAlertsMount } from '@/components/system/FailedMessageAlertsMount';
import { AutomationFailureAlertsMount } from '@/components/system/AutomationFailureAlertsMount';
import { IntegrationMigrationMount } from '@/components/system/IntegrationMigrationMount';
import { MobileShell } from '@/components/mobile/MobileShell';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useZenMode } from '@/hooks/useZenMode';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useVoiceActionHandler } from '@/hooks/useVoiceActionHandler';

const LazyVoiceOverlay = lazy(() => import('@/components/voice/VoiceSearchOverlayConnected'));

// Memoize sub-components to prevent unnecessary re-renders when parent state changes
const MemoizedSidebar = memo(Sidebar);
const MemoizedMobileShell = memo(MobileShell);
const MemoizedViewRouter = memo(ViewRouter);

interface AppShellProps {
  currentView: string;
  setCurrentView: (viewId: string) => void;
  userId?: string;
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
  breadcrumbTrail: string[];
  navDirectionRef: React.MutableRefObject<'forward' | 'back'>;
  profile: { name?: string | null; avatar_url?: string | null } | null;
  userEmail: string;
  signOut: () => void;
  unreadNotifications: number;
  showChecklist: boolean;
  loading: boolean;
}

export const AppShell = forwardRef<HTMLDivElement, AppShellProps>(function AppShell({
  currentView,
  setCurrentView,
  userId,
  canGoBack,
  canGoForward,
  goBack,
  goForward,
  breadcrumbTrail,
  navDirectionRef,
  profile,
  userEmail,
  signOut,
  unreadNotifications,
  showChecklist,
  loading,
}, _ref) {
  const isMobile = useIsMobile();
  const { isZen, toggleZen } = useZenMode();
  const isInboxView = currentView === 'inbox' || currentView === 'team-chat';
  const { startTransition } = useViewTransition();
  const [voiceOpen, setVoiceOpen] = useState(false);

  const handleViewChange = useCallback((viewId: string) => {
    startTransition(() => setCurrentView(viewId));
  }, [startTransition, setCurrentView]);

  const handleVoiceAction = useVoiceActionHandler(handleViewChange);

  // Mobile edge-swipe navigation
  useSwipeNavigation({
    onSwipeBack: goBack,
    onSwipeForward: goForward,
    canGoBack,
    canGoForward,
    enabled: isMobile,
    edgeWidth: 20,
    threshold: 60,
  });

  const appVersion = useMemo(() => {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '.');
    return `v2.0.${today}.10-10`;
  }, []);

  const currentAgent = useMemo(() => ({
    name: profile?.name || userEmail || 'Usuário',
    avatar: profile?.avatar_url || undefined,
    status: 'online',
  }), [profile?.name, profile?.avatar_url, userEmail]);

  return (
    <div className="flex h-screen max-h-screen min-h-screen bg-background overflow-hidden relative selection:bg-primary/20">
      <RouteLoadingBar isLoading={loading} />
      
      {/* Background mounts are non-visual or global UI overlays */}
      <Suspense fallback={null}>
        <FailedMessageAlertsMount />
        <AutomationFailureAlertsMount />
        <IntegrationMigrationMount />
      </Suspense>

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Pular para o conteúdo
      </a>

      {isMobile ? (
        <MemoizedMobileShell
          currentView={currentView}
          setCurrentView={setCurrentView}
          profile={profile}
          userEmail={userEmail}
          signOut={signOut}
          unreadNotifications={unreadNotifications}
        />
      ) : (
        !isZen && (
          <MemoizedSidebar
            currentView={currentView}
            onViewChange={handleViewChange}
            currentAgent={currentAgent}
            onLogout={signOut}
            inboxBadge={unreadNotifications || undefined}
          />
        )
      )}

      {!isMobile && (
        <div className="fixed bottom-2 left-2 z-[60] flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/10 border border-border/10 text-[9px] text-muted-foreground/60 select-none pointer-events-none opacity-40 hover:opacity-100 transition-opacity">
          <Info className="w-2.5 h-2.5 opacity-40" />
          <span>{appVersion}</span>
          <span className="w-1 h-1 rounded-full bg-success/40" />
          <span className="uppercase tracking-tighter opacity-40">Build 10/10</span>
        </div>
      )}

      <main
        id="main-content"
        role="main"
        aria-label="Conteúdo principal"
        tabIndex={-1}
        className={cn(
          'flex flex-1 overflow-hidden relative min-w-0 min-h-0 h-full max-h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset',
          isMobile && 'pt-12 pb-[64px]'
        )}
      >
        {!isMobile && isInboxView && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleZen}
                className={cn(
                  'absolute top-3 right-3 z-30 h-9 rounded-full flex items-center gap-2 transition-all duration-500',
                  'border border-border/40 shadow-sm backdrop-blur-md touch-manipulation focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                  isZen
                    ? 'px-4 bg-primary/15 border-primary/40 text-primary hover:bg-primary/25 hover:border-primary/60 shadow-lg shadow-primary/10'
                    : 'px-3.5 bg-background/80 border-border/40 text-muted-foreground/80 hover:text-foreground hover:bg-background hover:border-border/80'
                )}
                aria-label={isZen ? 'Sair do modo zen' : 'Entrar no modo zen'}
              >
                {isZen ? <Minimize2 className="w-3.5 h-3.5" /> : <Target className="w-4 h-4" />}
                <span className="text-[11px] font-medium tracking-wide">
                  {isZen ? 'Sair' : 'Zen'}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8} className="text-xs">
              {isZen ? 'Sair do modo zen (Esc)' : 'Modo zen — foco total'}
            </TooltipContent>
          </Tooltip>
        )}
        
        {showChecklist && currentView === 'dashboard' && (
          <div className="absolute top-4 right-4 z-20 w-96 max-w-[calc(100%-2rem)] animate-slide-in-right">
            <OnboardingChecklist onNavigate={handleViewChange} />
          </div>
        )}

        <Suspense fallback={<ViewLoadingFallback />}>
          <MemoizedViewRouter
            currentView={currentView}
            userId={userId}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onGoBack={goBack}
            onGoForward={goForward}
            breadcrumbTrail={breadcrumbTrail}
            onNavigateTo={handleViewChange}
          />
        </Suspense>
      </main>

      {!isMobile && (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setVoiceOpen(true)}
              className="fixed bottom-6 right-6 z-50 w-[54px] h-[54px] rounded-full bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 active:scale-95 transition-all duration-500 flex items-center justify-center border border-primary/20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
              aria-label="Assistente de voz inteligente"
            >
              <Mic className="w-6 h-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={8}>
            Assistente de Voz IA
          </TooltipContent>
        </Tooltip>
      )}

      {voiceOpen && (
        <Suspense fallback={null}>
          <LazyVoiceOverlay
            isOpen={voiceOpen}
            onClose={() => setVoiceOpen(false)}
            onAction={handleVoiceAction}
            onError={(msg) => toast.error(msg)}
          />
        </Suspense>
      )}

      <div id="a11y-status" role="status" aria-live="polite" aria-atomic="true" className="sr-only" />
      <div id="a11y-alert" role="alert" aria-live="assertive" aria-atomic="true" className="sr-only" />
    </div>
  );
});