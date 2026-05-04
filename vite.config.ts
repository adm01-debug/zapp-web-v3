import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { compression } from "vite-plugin-compression2";

// Fallback Supabase credentials when Lovable integration is disconnected
const SUPABASE_FALLBACK_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_FALLBACK_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

// Chunks pesados que NÃO devem ser preloaded no first paint.
// São lazy-loaded só quando rotas/componentes que usam mapbox/pdf/elevenlabs
// forem renderizados (LocationPicker, RealtimeTranscription, etc).
// Economia esperada: ~750KB gzip no first load.
const LAZY_VENDOR_CHUNKS = ['vendor-mapbox', 'vendor-pdf', 'vendor-elevenlabs'];

const stripLazyModulepreloadsPlugin: Plugin = {
  name: 'strip-lazy-modulepreloads',
  apply: 'build',
  transformIndexHtml(html) {
    let out = html;
    let removed = 0;
    for (const chunk of LAZY_VENDOR_CHUNKS) {
      const re = new RegExp(`\\s*<link[^>]*rel="modulepreload"[^>]*href="[^"]*${chunk}[^"]*"[^>]*>`, 'g');
      const before = out.length;
      out = out.replace(re, '');
      if (out.length !== before) removed++;
    }
    if (removed > 0) {
      console.log(`[strip-lazy-modulepreloads] removidos ${removed} preload(s) de chunks lazy: ${LAZY_VENDOR_CHUNKS.join(', ')}`);
    }
    return out;
  },
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
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
          // v6: cache agressivo dos próprios assets versionados
          {
            urlPattern: /\/assets\/.*\.(js|css|woff2?|png|svg|webp|avif)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: false,
    }),
    compression({ algorithm: "gzip", exclude: [/\.(br|gz)$/], threshold: 1024 }),
    compression({ algorithm: "brotliCompress", exclude: [/\.(br|gz)$/], threshold: 1024 }),
    stripLazyModulepreloadsPlugin,
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
    drop: mode === 'production' ? ['debugger'] : [],
    // Drop apenas console.log/debug em prod — preserva console.info/warn/error
    // (necessário pro Sentry SDK funcionar e para diagnóstico de erros em runtime)
    pure: mode === 'production' ? ['console.log', 'console.debug'] : [],
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    cssMinify: true,
    manifest: true,
    chunkSizeWarningLimit: 1700,
    hash: true,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
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
          if (id.includes('jspdf') || id.includes('pdf-lib') || id.includes('pdfjs-dist')) return 'vendor-pdf';
          if (id.includes('mapbox-gl')) return 'vendor-mapbox';
          if (id.includes('@elevenlabs')) return 'vendor-elevenlabs';
          if (id.includes('@sentry')) return 'vendor-sentry';
          if (id.includes('@radix-ui')) {
            return 'vendor-radix';
          }
        },
      },
    },
  },
}));
