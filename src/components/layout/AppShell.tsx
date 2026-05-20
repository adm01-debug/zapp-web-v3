import { Suspense, useCallback, forwardRef, lazy, useState } from 'react';
import { Target, Mic } from 'lucide-react';
import { useViewTransition } from '@/hooks/useViewTransition';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/layout/Sidebar';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { ViewRouter } from '@/pages/ViewRouter';
import { ViewLoadingFallback } from '@/components/layout/ViewLoadingFallback';
import { RouteLoadingBar } from '@/components/ui/route-loading-bar';
import { MobileShell } from '@/components/mobile/MobileShell';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useZenMode } from '@/hooks/useZenMode';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import type { VoiceAgentAction } from '@/hooks/voice/types';

const LazyVoiceOverlay = lazy(() => import('@/components/voice/VoiceSearchOverlayConnected'));

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

  const handleVoiceAction = useCallback((action: VoiceAgentAction) => {
    switch (action.action) {
      case 'navigate':
        if (action.data?.route) {
          handleViewChange(action.data.route);
          toast.success(`Navegando para ${action.data.route}`);
        }
        break;
      case 'search':
        if (action.data?.query) {
          handleViewChange('contacts');
          toast.info(`Buscando: "${action.data.query}"`);
        }
        break;
      case 'filter':
        if (action.data?.filters) {
          handleViewChange('inbox');
          toast.info('Filtros aplicados por comando de voz');
        }
        break;
      case 'sort':
        if (action.data?.sortBy) {
          toast.info(`Ordenação alterada: ${action.data.sortBy}`);
        }
        break;
      case 'clear':
        toast.info('Filtros limpos');
        break;
      case 'answer':
        // Verbal response already given via TTS
        break;
    }
  }, [handleViewChange]);

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

  return (
    <div className="flex h-screen max-h-screen min-h-screen bg-background overflow-hidden relative">
      <RouteLoadingBar isLoading={loading} />

      {/* Skip to content — a11y */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Pular para o conteúdo
      </a>

      {/* Mobile wrapper */}
      {isMobile && (
        <MobileShell
          currentView={currentView}
          setCurrentView={setCurrentView}
          profile={profile}
          userEmail={userEmail}
          signOut={signOut}
          unreadNotifications={unreadNotifications}
        />
      )}

      {/* Desktop Sidebar — hidden in zen mode */}
      {!isMobile && !isZen && (
        <Sidebar
          currentView={currentView}
          onViewChange={handleViewChange}
          currentAgent={{
            name: profile?.name || userEmail || 'Usuário',
            avatar: profile?.avatar_url || undefined,
            status: 'online',
          }}
          onLogout={signOut}
          inboxBadge={unreadNotifications || undefined}
        />
      )}

      <main
        id="main-content"
        role="main"
        aria-label="Conteúdo principal"
        tabIndex={-1}
        className={cn(
          'flex flex-1 overflow-hidden relative min-w-0 min-h-0 h-full max-h-full focus:outline-2 focus:outline-primary/40 focus:outline-offset-[-2px]',
          isMobile && 'pt-12 pb-[56px]'
        )}
      >
        {/* Zen mode toggle — desktop only, chat views */}
        {!isMobile && isInboxView && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={toggleZen}
                className={cn(
                  'absolute top-3 right-3 z-30 h-8 rounded-full flex items-center gap-1.5 transition-all duration-200',
                  'border backdrop-blur-sm shadow-sm',
                  isZen
                    ? 'px-3 bg-primary/15 border-primary/30 text-primary hover:bg-primary/25 hover:border-primary/50 shadow-primary/10'
                    : 'px-2.5 bg-card/80 border-border/40 text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 hover:border-border/70'
                )}
                aria-label={isZen ? 'Sair do modo zen' : 'Modo zen'}
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
          <div className="absolute top-4 right-4 z-20 w-96 max-w-[calc(100%-2rem)]">
            <OnboardingChecklist onNavigate={handleViewChange} />
          </div>
        )}

        <Suspense fallback={<ViewLoadingFallback />}>
              <ViewRouter
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

      {/* Voice Copilot FAB */}
      {!isMobile && (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setVoiceOpen(true)}
              className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
              aria-label="Assistente de voz"
            >
              <Mic className="w-6 h-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={8}>
            Assistente de Voz IA
          </TooltipContent>
        </Tooltip>
      )}

      {/* Voice Overlay (lazy loaded) */}
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

      {/* Accessible live region for screen reader announcements */}
      <div
        id="a11y-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        id="a11y-alert"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </div>
  );
});
