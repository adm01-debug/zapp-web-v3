import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
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
        // Force new SW to take over immediately
        skipWaiting: true,
        clientsClaim: true,
        // Clean old caches on update
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
      manifest: false, // Use existing public/manifest.json
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
    chunkSizeWarningLimit: 1700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          // UI framework
          if (id.includes('framer-motion') || id.includes('class-variance-authority') || id.includes('clsx') || id.includes('tailwind-merge')) {
            return 'vendor-ui';
          }
          // Lucide icons - consolidate all into one chunk
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          // Data layer
          if (id.includes('@tanstack/react-query') || id.includes('@supabase/supabase-js')) {
            return 'vendor-data';
          }
          // Date utilities
          if (id.includes('date-fns')) {
            return 'vendor-date-fns';
          }
          // Charts
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'vendor-charts';
          }
          // i18n
          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'vendor-i18n';
          }
          // Heavy libs - lazy loaded
          if (id.includes('xlsx')) return 'vendor-xlsx';
          if (id.includes('jspdf')) return 'vendor-pdf';
          if (id.includes('mapbox-gl')) return 'vendor-mapbox';
          if (id.includes('@elevenlabs')) return 'vendor-elevenlabs';
          // Radix UI components
          if (id.includes('@radix-ui')) {
            return 'vendor-radix';
          }
        },
      },
    },
  },
}));
