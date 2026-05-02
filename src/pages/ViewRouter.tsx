import { Construction } from 'lucide-react';
import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useCurrentModule } from '@/hooks/useCurrentModule';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAriaAnnouncer } from '@/hooks/useAriaAnnouncer';
import { useUserRole, type AppRole } from '@/features/auth';
import { ErrorBoundaryWithRetry } from '@/components/ui/error-boundary-retry';
import { NotAuthorizedView } from '@/features/auth';

import * as Views from './lazyViews';

// Route-level role gates. Backend RPC/RLS remain the source of truth — this is a UX layer.
// `hasRole` é hierárquico: requerer 'admin' já libera para dev; requerer 'supervisor' libera para admin/dev.
const VIEW_REQUIRED_ROLES: Record<string, AppRole[]> = {
  // Áreas técnicas — visualização: admin+ (admin já inclui dev).
  'failed-messages': ['admin'],
  'failed-auth-messages': ['admin'],
  'search-insights': ['admin'],
  // Operação — supervisor+
  'agents-ops': ['supervisor'],
  'realtime-monitor': ['supervisor'],
  'dispatch-errors-history': ['supervisor'],
};

interface ViewRouterProps {
  currentView: string;
  userId?: string;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onGoBack?: () => void;
  onGoForward?: () => void;
  breadcrumbTrail?: string[];
  onNavigateTo?: (viewId: string) => void;
}

// Views that manage their own full-screen layout (no header)
const FULL_SCREEN_VIEWS = new Set(['inbox', 'pipeline', 'omni-inbox', 'team-chat', 'email-chat']);

interface WithHeaderProps {
  viewId: string;
  children: React.ReactNode;
}

function WithHeader({ viewId, children }: WithHeaderProps) {
  if (FULL_SCREEN_VIEWS.has(viewId)) return <>{children}</>;
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-auto p-6">{children}</div>
    </div>
  );
}

// Declarative route map — easier to maintain than switch/case
const VIEW_MAP: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  'inbox': Views.RealtimeInboxView,
  'dashboard': Views.DashboardView,
  'agents': Views.AgentsView,
  'queues': Views.QueuesView,
  'contacts': Views.ContactsView,
  'groups': Views.GroupsView,
  'connections': Views.ConnectionsView,
  'wallet': Views.ClientWalletView,
  'catalog': Views.ProductManagement,
  'transcriptions': Views.TranscriptionsHistoryView,
  'admin': Views.AdminView,
  'tags': Views.TagsView,
  'sentiment': Views.SentimentAlertsDashboard,
  'reports': Views.AdvancedReportsView,
  'security': Views.SecurityView,
  'settings': Views.SettingsView,
  'docs': Views.SystemFeaturesView,
  'campaigns': Views.CampaignsView,
  'chatbot': Views.ChatbotFlowsView,
  'automations': Views.AutomationsManager,
  'integrations': Views.IntegrationsHub,
  'privacy': Views.LGPDComplianceView,
  'pipeline': Views.SalesPipelineView,
  'knowledge': Views.KnowledgeBaseView,
  'payments': Views.PaymentLinksView,
  'wa-flows': Views.WhatsAppFlowsBuilder,
  'meta-capi': Views.MetaCAPIView,
  'diagnostics': Views.DiagnosticsView,
  'voip': Views.VoIPPanel,
  'auto-export': Views.AutoExportManager,
  'google-calendar': Views.GoogleCalendarIntegration,
  'themes': Views.ThemeCustomizer,
  'schedule': Views.ScheduleCalendarView,
  'warroom': Views.WarRoomDashboard,
  'wa-templates': Views.WhatsAppTemplatesManager,
  'omnichannel': Views.OmnichannelManager,
  'churn': Views.ChurnPredictionDashboard,
  'ticket-classifier': Views.AutoTicketClassifier,
  'performance': Views.PerformanceMonitor,
  'omni-inbox': Views.OmnichannelInbox,
  'audit-logs': Views.AuditLogDashboard,
  'telemetry': Views.AdminTelemetriaPage,
  'failed-messages': Views.AdminFailedMessagesPage,
  'failed-auth-messages': Views.AdminFailedAuthMessagesPage,
  'webhook-events': Views.AdminWebhookEventsPage,
  'evolution-api-logs': Views.AdminEvolutionApiLogsPage,
  'alert-history': Views.AdminAlertHistoryPage,
  'webhook-overview': Views.AdminWebhookOverviewPage,
  'nps': Views.NPSDashboard,
  'team-chat': Views.TeamChatView,
  'email-chat': Views.EmailChatView,
  'gmail': Views.GmailInboxView,
  'public-api': Views.PublicApiDashboard,
  'gmail-webhook': Views.GmailWebhookMonitor,
  'media-migration': Views.MediaMigrationTool,
  'sicoob-bridge': Views.SicoobBridgeDashboard,
  'crm360': Views.CRM360ExplorerView,
  'ai-usage': Views.AIUsageDashboard,
  'sla': Views.SLADashboardView,
  'talkx': Views.TalkXView,
  'evolution-monitor': Views.EvolutionMonitoringDashboard,
  'webhook-secret': Views.AdminWebhookSecretStatusPage,
  'search-insights': Views.AdminSearchInsightsPage,
  'agents-ops': Views.AgentsOperationsPage,
  'realtime-monitor': Views.AdminRealtimeMonitorPage,
  'dispatch-errors-history': Views.AdminDispatchErrorsHistoryPage,
  'inbox-sync-status': Views.AdminInboxSyncStatusPage,
  'evo-api-health': Views.AdminEvoApiHealthPage,
  'gmail-status': Views.AdminGmailStatusPage,
};

// Views that need custom props
const SPECIAL_VIEWS: Record<string, (props: ViewRouterProps) => React.ReactNode> = {
  'achievements': (props) => (
    <ErrorBoundaryView viewId="achievements">
      <Views.AchievementsSystemLazy userId={props.userId} />
    </ErrorBoundaryView>
  ),
};

export function ViewRouter({ currentView, userId, canGoBack, canGoForward, onGoBack, onGoForward, breadcrumbTrail, onNavigateTo }: ViewRouterProps) {
  const mod = useCurrentModule(currentView);
  useDocumentTitle(mod.label);
  const { announce } = useAriaAnnouncer();
  const prefersReduced = useReducedMotion();

  // Announce view changes for screen readers
  useEffect(() => {
    announce(`Navegou para ${mod.label}`);
  }, [currentView, mod.label, announce]);

  const content = useMemo(() => {
    // Check special views first (those needing props)
    if (SPECIAL_VIEWS[currentView]) {
      return SPECIAL_VIEWS[currentView]({ currentView, userId, canGoBack, canGoForward, onGoBack, onGoForward, breadcrumbTrail, onNavigateTo });
    }
    // Standard views from map
    const ViewComponent = VIEW_MAP[currentView];
    if (ViewComponent) {
      return (
        <ErrorBoundaryView viewId={currentView}>
          <ViewComponent />
        </ErrorBoundaryView>
      );
    }
    return <FallbackView currentView={currentView} />;
  }, [currentView, userId]);

  return (
    <WithHeader viewId={currentView}>
      {prefersReduced ? (
        <div key={currentView} className="h-full w-full">{content}</div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="h-full w-full"
          >
            {content}
          </motion.div>
        </AnimatePresence>
      )}
    </WithHeader>
  );
}

/** Per-view error boundary with automatic retry + role gating. */
function ErrorBoundaryView({ viewId, children }: { viewId: string; children: React.ReactNode }) {
  const mod = useCurrentModule(viewId);
  const requiredRoles = VIEW_REQUIRED_ROLES[viewId];
  const { hasRole, loading: rolesLoading } = useUserRole();

  if (requiredRoles) {
    if (rolesLoading) {
      return (
        <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground" role="status" aria-busy="true">
          Verificando permissões…
        </div>
      );
    }
    const allowed = requiredRoles.some((r) => hasRole(r));
    if (!allowed) return <NotAuthorizedView viewLabel={mod.label} />;
  }

  return (
    <ErrorBoundaryWithRetry
      key={viewId}
      moduleName={mod.label}
      maxAutoRetries={2}
    >
      {children}
    </ErrorBoundaryWithRetry>
  );
}

function FallbackView({ currentView }: { currentView: string }) {
  const mod = useCurrentModule(currentView);
  const Icon = mod.icon || Construction;

  return (
    <div className="flex items-center justify-center h-full bg-gradient-to-b from-background to-muted/20">
      <div className="text-center max-w-sm px-6 animate-fade-in">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20"
          style={{ background: 'var(--gradient-primary)' }}
        >
          <Icon className="w-9 h-9 text-primary-foreground" />
        </div>

        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          {mod.label}
        </h2>

        {mod.group && (
          <span className="inline-block text-[11px] font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full mb-3">
            {mod.group}
          </span>
        )}

        <p className="text-muted-foreground text-sm leading-relaxed">
          Este módulo está em desenvolvimento e será disponibilizado em breve.
        </p>

        <div className="flex items-center justify-center gap-1.5 mt-6 text-xs text-muted-foreground/60">
          <Construction className="w-3.5 h-3.5" />
          <span>Em construção</span>
        </div>
      </div>
    </div>
  );
}
