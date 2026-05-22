import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        maxForks: 2,
        minForks: 1,
      },
    },
    env: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_EXTERNAL_SUPABASE_URL: 'https://external-test.supabase.co',
      VITE_EXTERNAL_SUPABASE_ANON_KEY: 'test-external-anon-key',
    },
    exclude: [
      'node_modules/**',
      'dist/**',
      '.dist-backups/**',
      'e2e/**',
      'tests/**',
      'supabase/functions/**',
      'scripts/**',
      'src/features/inbox/components/chat/__tests__/chat-e2e.spec.ts',
      'src/test/load-test.ts',
      'src/test/stress-test.test.ts',
      'src/pages/admin/AdminGmailStatusPage.test.ts',
      'src/components/inbox/contact-details/__tests__/WhatsAppStatusSection.test.tsx',
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: ['node_modules/', 'src/test/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
