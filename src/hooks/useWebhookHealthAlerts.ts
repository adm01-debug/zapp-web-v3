/**
 * useWebhookHealthAlerts — polling de saúde do webhook por instância.
 *
 * Detecta dois cenários e dispara toast + som + notificação do navegador
 * (respeitando quiet hours):
 *   - signature_spike: pico de assinaturas inválidas
 *   - webhook_silence: instância ativa parou de receber eventos
 *
 * Cooldown de 5min por (instância+tipo) evita fadiga de alerta.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryExternalProxy } from '@/lib/externalProxy';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import {
  playNotificationSound,
  showBrowserNotification,
  requestNotificationPermission,
} from '@/utils/notificationSound';
import {
  ALERT_COOLDOWN_MS,
  evaluateAllInstances,
  loadAlertConfig,
  shouldFireAlert,
  type InstanceHealthStats,
  type WebhookAlertBreach,
  type WebhookAlertConfig,
} from '@/lib/webhookHealthAlerts';
import { getLogger } from '@/lib/logger';

const log = getLogger('useWebhookHealthAlerts');

interface RawEvent {
  instance_name: string | null;
  signature_valid: boolean | null;
  created_at: string;
}

interface RecentEvent extends RawEvent {
  /** janela curta (15min) — usado pra spike */
  inShortWindow: boolean;
}

const SHORT_WINDOW_MIN = 15;
const POLL_INTERVAL_MS = 30_000;
const MAX_RECENT_ALERTS = 5;

export interface RecentAlertEntry extends WebhookAlertBreach {
  firedAt: number;
}

export interface UseWebhookHealthAlertsResult {
  config: WebhookAlertConfig;
  setConfig: (next: WebhookAlertConfig) => void;
  activeBreaches: WebhookAlertBreach[];
  recentAlerts: RecentAlertEntry[];
  isPolling: boolean;
}

interface UseWebhookHealthAlertsOptions {
  /** Quando false, o hook não faz polling (útil pra testes/mounting condicional). */
  enabled?: boolean;
  /** Override de config (UI passa direto pra evitar re-leitura do storage). */
  config?: WebhookAlertConfig;
}

export function useWebhookHealthAlerts(
  options: UseWebhookHealthAlertsOptions = {},
): UseWebhookHealthAlertsResult {
  const { enabled = true, config: configOverride } = options;
  const { settings, isQuietHours } = useNotificationSettings();

  const [config, setConfigState] = useState<WebhookAlertConfig>(
    () => configOverride ?? loadAlertConfig(),
  );
  useEffect(() => {
    if (configOverride) setConfigState(configOverride);
  }, [configOverride]);

  const setConfig = useCallback((next: WebhookAlertConfig) => {
    setConfigState(next);
  }, []);

  const cooldownRef = useRef<Map<string, number>>(new Map());
  const [activeBreaches, setActiveBreaches] = useState<WebhookAlertBreach[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlertEntry[]>([]);

  // Pede permissão de notificação uma vez se habilitado.
  useEffect(() => {
    if (!enabled || !settings.browserNotifications) return;
    requestNotificationPermission().catch(() => {
      /* ignore */
    });
  }, [enabled, settings.browserNotifications]);

  const eventsQuery = useQuery({
    queryKey: ['webhook-health-alerts-events'],
    queryFn: async (): Promise<RecentEvent[]> => {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const res = await queryExternalProxy<RawEvent>({
        table: 'evolution_webhook_events',
        select: 'instance_name,signature_valid,created_at',
        filters: [{ column: 'created_at', operator: 'gte', value: since24h }],
        order: { column: 'created_at', ascending: false },
        limit: 500,
      });
      const shortCutoff = Date.now() - SHORT_WINDOW_MIN * 60_000;
      return (res.data ?? []).map((r) => ({
        ...r,
        inShortWindow: new Date(r.created_at).getTime() >= shortCutoff,
      }));
    },
    enabled: enabled && config.enabled,
    refetchInterval: enabled && config.enabled ? POLL_INTERVAL_MS : false,
    staleTime: POLL_INTERVAL_MS / 2,
  });

  // Avalia, dispara e atualiza estado quando dados chegam.
  useEffect(() => {
    const events = eventsQuery.data;
    if (!events || !config.enabled) {
      setActiveBreaches([]);
      return;
    }

    const byInstance = new Map<string, InstanceHealthStats>();
    for (const e of events) {
      const inst = e.instance_name ?? '(sem instância)';
      let s = byInstance.get(inst);
      if (!s) {
        s = { instance: inst, total: 0, invalid: 0, total24h: 0, lastEventAt: null };
        byInstance.set(inst, s);
      }
      s.total24h += 1;
      if (e.inShortWindow) {
        s.total += 1;
        if (e.signature_valid === false) s.invalid += 1;
      }
      if (!s.lastEventAt || e.created_at > s.lastEventAt) {
        s.lastEventAt = e.created_at;
      }
    }

    const breaches = evaluateAllInstances(Array.from(byInstance.values()), config);
    setActiveBreaches(breaches);

    if (breaches.length === 0) return;

    const fired: RecentAlertEntry[] = [];
    const quiet = isQuietHours();
    for (const b of breaches) {
      const key = `${b.instance}|${b.type}`;
      if (!shouldFireAlert(key, ALERT_COOLDOWN_MS, cooldownRef.current)) continue;

      const title =
        b.type === 'signature_spike'
          ? `Pico de assinaturas inválidas — ${b.instance}`
          : `Webhook em silêncio — ${b.instance}`;
      const description = b.reason;

      try {
        toast.error(title, { description });
      } catch (err) {
        log.warn('toast failed', err);
      }

      if (settings.soundEnabled && !quiet) {
        try {
          playNotificationSound('alert');
        } catch (err) {
          log.warn('sound failed', err);
        }
      }

      if (settings.browserNotifications) {
        try {
          showBrowserNotification(title, description);
        } catch (err) {
          log.warn('browser notification failed', err);
        }
      }

      fired.push({ ...b, firedAt: Date.now() });
      log.warn('webhook health alert fired', { type: b.type, instance: b.instance, reason: b.reason });
    }

    if (fired.length > 0) {
      setRecentAlerts((prev) => [...fired, ...prev].slice(0, MAX_RECENT_ALERTS));
    }
  }, [eventsQuery.data, config, settings.soundEnabled, settings.browserNotifications, isQuietHours]);

  return {
    config,
    setConfig,
    activeBreaches,
    recentAlerts,
    isPolling: eventsQuery.isFetching,
  };
}
