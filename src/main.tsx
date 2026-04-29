import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n"; // Initialize i18n 
import { getLogger } from "./lib/logger";
import { initWebVitals } from "./lib/web-vitals";

const log = getLogger('App');
log.info('Initialized at', new Date().toISOString());

// Detect HTTP 412 / "Failed to fetch" coming from the Lovable preview proxy
// so we can surface a friendly banner instead of letting the app appear blank.
const isPreviewProxyError = (reason: unknown) => {
  const msg = reason instanceof Error ? reason.message : String(reason ?? '');
  return /412|precondition failed|failed to fetch|networkerror/i.test(msg);
};

// Global unhandled error handlers for resilience
window.addEventListener('unhandledrejection', (event) => {
  if (isPreviewProxyError(event.reason)) {
    log.warn('[Preview] Sandbox proxy rejected a request:', event.reason);
    document.dispatchEvent(new CustomEvent('preview-precondition-error'));
    return;
  }
  log.error('Unhandled promise rejection:', event.reason);
});

window.addEventListener('error', (event) => {
  const reason = event.error || event.message;
  if (isPreviewProxyError(reason)) {
    log.warn('[Preview] Sandbox proxy raised an error:', reason);
    document.dispatchEvent(new CustomEvent('preview-precondition-error'));
    return;
  }
  log.error('Unhandled error:', reason);
});

// Initialize Web Vitals monitoring
initWebVitals();

// Accessibility auditing in development mode
if (import.meta.env.DEV) {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000, undefined, undefined, (results) => {
      const violations = results?.violations;
      if (violations?.length) {
        log.warn(`[A11Y] ${violations.length} accessibility violation(s) detected`);
        violations.forEach((v) => {
          log.warn(`[A11Y] ${String(v.impact || 'UNKNOWN').toUpperCase()}: ${v.id} — ${v.description} (${v.nodes.length} element(s))`);
        });
      }
    });
    log.info('[A11Y] axe-core accessibility auditing enabled');
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
