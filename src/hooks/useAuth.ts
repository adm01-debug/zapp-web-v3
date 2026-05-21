// Re-export auth primitives from the feature module for convenient
// `@/hooks/useAuth` imports used across the app and tests.
export { useAuth } from '@/features/auth/hooks/useAuth';
export * from '@/features/auth/hooks/useAuth';
export { AuthProvider } from '@/features/auth/components/AuthProvider';
