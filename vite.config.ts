import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// Fallback Supabase credentials when Lovable integration is disconnected
// These are safe to expose (anon/publishable keys are public by design)
// REMOVED: Hardcoded URL - use .env.local instead
const SUPABASE_FALLBACK_URL = process.env.VITE_SUPABASE_URL || '';
// REMOVED: Hardcoded key - use .env.local instead
const SUPABASE_FALLBACK_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // Inject Supabase env vars at build time as fallback
  // Lovable-injected env vars take priority when available
  define: {
    ...(process.env.VITE_SUPABASE_URL ? {} : {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(SUPABASE_FALLBACK_URL),
    }),
    ...(process.env.VITE_SUPABASE_PUBLISHABLE_KEY ? {} : {
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(SUPABASE_FALLBACK_KEY),
    }),
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallbackDenylist: [/^\/~oauth/],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: false,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "framer-motion"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "framer-motion", "lucide-react"],
    force: true,
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    cssMinify: true,
    manifest: true,
    chunkSizeWarningLimit: 1700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          if (id.includes('framer-motion') || id.includes('class-variance-authority') || id.includes('clsx') || id.includes('tailwind-merge')) {
            return 'vendor-ui';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('@tanstack/react-query') || id.includes('@supabase/supabase-js')) {
            return 'vendor-data';
          }
          if (id.includes('date-fns')) {
            return 'vendor-date-fns';
          }
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'vendor-charts';
          }
          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'vendor-i18n';
          }
          if (id.includes('xlsx')) return 'vendor-xlsx';
          if (id.includes('jspdf')) return 'vendor-pdf';
          if (id.includes('mapbox-gl')) return 'vendor-mapbox';
          if (id.includes('@elevenlabs')) return 'vendor-elevenlabs';
          if (id.includes('@radix-ui')) {
            return 'vendor-radix';
          }
        },
      },
    },
  },
}));
