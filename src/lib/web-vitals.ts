/**
 * Web Vitals monitoring utility
 * Tracks Core Web Vitals (LCP, FID, CLS, INP, TTFB), reports to console and backend observability.
 */

import { getLogger } from '@/lib/logger';

const log = getLogger('WebVitals');

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

const thresholds = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  TTFB: { good: 800, poor: 1800 },
};

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const t = thresholds[name as keyof typeof thresholds];
  if (!t) return 'good';
  if (value <= t.good) return 'good';
  if (value <= t.poor) return 'needs-improvement';
  return 'poor';
}

const metricsBuffer: WebVitalMetric[] = [];
const uploadQueue: WebVitalMetric[] = [];
let uploadTimer: number | null = null;
const OBS_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-observability`;
const OBS_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

async function flushMetrics() {
  if (!uploadQueue.length || !OBS_KEY || !import.meta.env.VITE_SUPABASE_URL) return;

  const batch = uploadQueue.splice(0, uploadQueue.length).map((metric) => ({
    ...metric,
    path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    timestamp: new Date().toISOString(),
  }));

  try {
    await fetch(OBS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: OBS_KEY,
        Authorization: `Bearer ${OBS_KEY}`,
      },
      body: JSON.stringify({ metrics: batch }),
      keepalive: true,
    });
  } catch (err) {
    log.warn('Failed sending web-vitals to backend observability', err);
  }
}

function scheduleFlush() {
  if (uploadTimer !== null) return;
  uploadTimer = window.setTimeout(() => {
    uploadTimer = null;
    void flushMetrics();
  }, 3000);
}

function onMetric(metric: WebVitalMetric) {
  metricsBuffer.push(metric);
  uploadQueue.push(metric);

  const emoji = metric.rating === 'good' ? '🟢' : metric.rating === 'needs-improvement' ? '🟡' : '🔴';
  const unit = metric.name === 'CLS' ? '' : 'ms';
  log.info(`${emoji} ${metric.name}: ${metric.value.toFixed(metric.name === 'CLS' ? 3 : 0)}${unit} (${metric.rating})`);

  if (typeof window !== 'undefined') scheduleFlush();
}

export function initWebVitals() {
  if (typeof window === 'undefined') return;

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void flushMetrics();
    }
  });

  // LCP - Largest Contentful Paint
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry;
      if (lastEntry) {
        onMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          rating: getRating('LCP', lastEntry.startTime),
          delta: lastEntry.startTime,
          id: `lcp-${Date.now()}`,
        });
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_e) { /* not supported */ }

  // FID - First Input Delay
  try {
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fid = (entry as PerformanceEventTiming).processingStart - entry.startTime;
        onMetric({
          name: 'FID',
          value: fid,
          rating: getRating('FID', fid),
          delta: fid,
          id: `fid-${Date.now()}`,
        });
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch (_e) { /* not supported */ }

  // CLS - Cumulative Layout Shift
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
          clsValue += (entry as PerformanceEntry & { value: number }).value;
        }
      }
      onMetric({
        name: 'CLS',
        value: clsValue,
        rating: getRating('CLS', clsValue),
        delta: clsValue,
        id: `cls-${Date.now()}`,
      });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch (_e) { /* not supported */ }

  // INP - Interaction to Next Paint
  try {
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const duration = entry.duration;
        onMetric({
          name: 'INP',
          value: duration,
          rating: getRating('INP', duration),
          delta: duration,
          id: `inp-${Date.now()}`,
        });
      }
    });
    inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 40 } as PerformanceObserverInit);
  } catch (_e) { /* not supported */ }

  // TTFB - Time to First Byte
  try {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navEntry) {
      const ttfb = navEntry.responseStart - navEntry.requestStart;
      onMetric({
        name: 'TTFB',
        value: ttfb,
        rating: getRating('TTFB', ttfb),
        delta: ttfb,
        id: `ttfb-${Date.now()}`,
      });
    }
  } catch (e) {
    log.debug('Navigation Timing API not supported', e);
  }
}

export function getWebVitalsReport(): WebVitalMetric[] {
  return [...metricsBuffer];
}
