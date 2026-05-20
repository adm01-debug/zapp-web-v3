/**
 * Accessibility Checker for Stress Test.
 * Validates if private/public media URLs are reachable and return the expected content.
 */
import { getLogger } from '@/lib/logger';

const log = getLogger('MediaAccessibility');

export interface AccessibilityResult {
  reachable: boolean;
  statusCode?: number;
  contentType?: string;
  error?: string;
  latencyMs: number;
}

export async function checkUrlAccessibility(url: string, timeoutMs = 5000): Promise<AccessibilityResult> {
  const start = performance.now();
  
  // Simulated private URL logic for stress testing token expiration
  const urlObj = new URL(url);
  const token = urlObj.searchParams.get('token');
  const expires = urlObj.searchParams.get('expires');
  
  if (token === 'expired_test' || (expires && parseInt(expires) < Date.now())) {
    return {
      reachable: false,
      statusCode: 403,
      error: 'Token expired or invalid (Simulated)',
      latencyMs: Math.round(performance.now() - start),
    };
  }

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    // If it's a simulated valid token, we skip the real fetch or just do it
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(id);
    
    return {
      reachable: response.ok,
      statusCode: response.status,
      contentType: response.headers.get('content-type') || undefined,
      latencyMs: Math.round(performance.now() - start),
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`URL unreachable: ${url}`, err);
    return {
      reachable: false,
      error: msg,
      latencyMs,
    };
  }
}
