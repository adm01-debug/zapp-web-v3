import { useEffect, useRef } from 'react';
import { getLogger } from '@/lib/logger';

const log = getLogger('PerformanceMetrics');

export function usePerformanceMetrics(componentName: string) {
  const lastRenderTime = useRef(performance.now());
  const renderCount = useRef(0);

  useEffect(() => {
    const now = performance.now();
    const duration = now - lastRenderTime.current;
    renderCount.current++;

    if (duration > 16.67) { // Missed a frame (60fps)
      log.warn(`[${componentName}] Long task detected: ${duration.toFixed(2)}ms (Render #${renderCount.current})`);
    }

    lastRenderTime.current = now;
  });

  // Track LCP if needed in the future
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        log.info(`[${componentName}] LCP: ${entry.startTime.toFixed(2)}ms`);
      });
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });
    return () => observer.disconnect();
  }, [componentName]);
}
