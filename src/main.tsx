import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n"; // Initialize i18n 
import { getLogger } from "./lib/logger";
import { initSentry, SentryErrorBoundary } from "./lib/sentry";
import { initWebVitals } from "./lib/web-vitals";
import { installPreviewHttpLogger } from "./lib/previewHttpLogger";

// Intercepta fetch para capturar 412 / Failed to fetch no preview Lovable
installPreviewHttpLogger();

// Init Sentry first (no-op se VITE_SENTRY_DSN não estiver configurada)
const sentryEnabled = initSentry();

const log = getLogger('App');
if (sentryEnabled) log.info('Sentry SDK ativo');
log.info('Initialized at', new Date().toISOString());

// Global unhandled error handlers for resilience
window.addEventListener('unhandledrejection', (event) => {
  log.error('Unhandled promise rejection:', event.reason);
});

window.addEventListener('error', (event) => {
  log.error('Unhandled error:', event.error || event.message);
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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <SentryErrorBoundary
    fallback={({ error, resetError }) => (
      <div role="alert" style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '40px auto' }}>
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>Algo deu errado</h1>
        <p style={{ color: '#64748b', marginBottom: 16 }}>
          O erro foi registrado e nossa equipe foi notificada. Você pode tentar de novo:
        </p>
        <button onClick={resetError} style={{ padding: '8px 16px', borderRadius: 8, background: '#10b981', color: '#fff', border: 0, cursor: 'pointer' }}>
          Tentar novamente
        </button>
        {import.meta.env.DEV && (
          <pre style={{ marginTop: 16, padding: 12, background: '#1e293b', color: '#fca5a5', borderRadius: 8, overflow: 'auto', fontSize: 12 }}>
            {String(error?.toString?.() ?? error)}
          </pre>
        )}
      </div>
    )}
    showDialog={false}
  >
    <App />
  </SentryErrorBoundary>
);
