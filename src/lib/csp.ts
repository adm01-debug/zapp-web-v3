/**
 * Content Security Policy (CSP) configuration for ZAPP WEB.
 *
 * Defines trusted sources for scripts, styles, images, connections, etc.
 * Applied via meta tag in index.html or via Supabase Edge Function headers.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const EVOLUTION_API_URL = import.meta.env.VITE_EVOLUTION_API_URL || '';

/** Trusted domains for various CSP directives */
export const CSP_SOURCES = {
  scripts: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
  styles: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  images: [
    "'self'",
    'data:',
    'blob:',
    SUPABASE_URL,
    'https://*.supabase.co',
    'https://*.whatsapp.net',
    'https://*.wa.me',
  ],
  connect: [
    'https://*.atomicabr.com.br',
    'wss://*.atomicabr.com.br',
    "'self'",
    SUPABASE_URL,
    `${SUPABASE_URL.replace('https://', 'wss://')}/realtime/v1`,
    EVOLUTION_API_URL,
    'https://api.openai.com',
    'https://api.elevenlabs.io',
    'wss://*.supabase.co',
  ],
  fonts: ["'self'", 'https://fonts.gstatic.com'],
  media: ["'self'", 'blob:', SUPABASE_URL, 'https://*.supabase.co'],
  frames: ["'none'"],
  objects: ["'none'"],
  base: ["'self'"],
} as const;

/**
 * Generates the CSP header value string.
 * Can be used in a meta tag or HTTP header.
 */
export function generateCSP(): string {
  return [
    `default-src 'self'`,
    `script-src ${CSP_SOURCES.scripts.join(' ')}`,
    `style-src ${CSP_SOURCES.styles.join(' ')}`,
    `img-src ${CSP_SOURCES.images.join(' ')}`,
    `connect-src ${CSP_SOURCES.connect.join(' ')}`,
    `font-src ${CSP_SOURCES.fonts.join(' ')}`,
    `media-src ${CSP_SOURCES.media.join(' ')}`,
    `frame-src ${CSP_SOURCES.frames.join(' ')}`,
    `object-src ${CSP_SOURCES.objects.join(' ')}`,
    `base-uri ${CSP_SOURCES.base.join(' ')}`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ].join('; ');
}

/**
 * Additional security headers for the application.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
};
