import { test, expect } from '@playwright/test';

// Centralized test configuration
export const testConfig = {
  baseUrl: process.env.VITE_APP_URL || 'http://localhost:5173',
  supabaseUrl: process.env.VITE_SUPABASE_URL,
  supabaseAnonKey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  isCI: !!process.env.CI,
  testTimeout: 30000,
};

// Environment validator
export function validateTestEnvironment() {
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`❌ Missing required test environment variables: ${missing.join(', ')}`);
  }
  console.log('✅ Test environment validated.');
}
