/**
 * HMAC Webhook Signature Validation
 * 
 * Provides secure validation of webhook payloads using HMAC-SHA256.
 * Uses Web Crypto API for cryptographic operations and implements
 * constant-time comparison to prevent timing attacks.
 */

/**
 * Validates HMAC-SHA256 signature of a webhook payload.
 * 
 * @param payload - Raw request body as string
 * @param signature - Signature from webhook header (hex-encoded or with 'sha256=' prefix)
 * @param secret - Shared secret key
 * @returns true if signature is valid
 */
export async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!payload || !signature || !secret) {
    return false;
  }

  try {
    // Remove 'sha256=' prefix if present (common in GitHub-style webhooks)
    const normalizedSignature = signature.toLowerCase().replace(/^sha256=/, '');

    // Convert secret to key
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Compute expected signature
    const payloadBytes = encoder.encode(payload);
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, payloadBytes);
    
    // Convert to hex string
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison
    return timingSafeEqual(expectedSignature, normalizedSignature);
  } catch (error) {
    console.error('[HMAC] Signature verification error:', error);
    return false;
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 * Compares strings in constant time regardless of where they differ.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a full comparison to maintain constant time
    let dummy = 0;
    for (let i = 0; i < a.length; i++) {
      dummy |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Extracts signature from request headers.
 * Supports multiple common header formats.
 */
export function extractSignatureFromHeaders(headers: Headers): string | null {
  // Try common webhook signature headers in order of precedence
  const signatureHeaders = [
    'x-hub-signature-256',    // GitHub-style
    'x-signature',            // Generic
    'x-webhook-signature',    // Alternative
    'x-evolution-signature',  // Evolution API specific
    'x-api-signature',        // API Gateway style
  ];

  for (const header of signatureHeaders) {
    const value = headers.get(header);
    if (value) {
      return value;
    }
  }

  return null;
}

/**
 * WebhookSecurityService - Comprehensive webhook security validation.
 * 
 * Usage:
 * ```typescript
 * const security = new WebhookSecurityService('my-secret');
 * const validation = await security.validateRequest(req);
 * if (!validation.valid) {
 *   return new Response('Unauthorized', { status: 401 });
 * }
 * const payload = validation.payload;
 * ```
 */
export class WebhookSecurityService {
  private secret: string;
  private strictMode: boolean;

  /**
   * @param secret - HMAC secret for signature validation
   * @param strictMode - If true, rejects requests without signatures. Default: false
   */
  constructor(secret: string, strictMode = false) {
    this.secret = secret;
    this.strictMode = strictMode;
  }

  /**
   * Validates webhook request signature and returns parsed payload.
   */
  async validateRequest(req: Request): Promise<{
    valid: boolean;
    payload: string | null;
    error?: string;
    signatureFound: boolean;
    signatureValid: boolean;
  }> {
    const signature = extractSignatureFromHeaders(req.headers);
    const signatureFound = signature !== null;

    // Read body
    let payload: string;
    try {
      payload = await req.text();
    } catch (error) {
      return {
        valid: false,
        payload: null,
        error: 'Failed to read request body',
        signatureFound,
        signatureValid: false,
      };
    }

    // If no signature and strict mode, reject
    if (!signatureFound && this.strictMode) {
      console.warn('[HMAC] Strict mode: rejecting request without signature');
      return {
        valid: false,
        payload,
        error: 'Missing webhook signature',
        signatureFound: false,
        signatureValid: false,
      };
    }

    // If no signature and not strict mode, allow (for backwards compatibility)
    if (!signatureFound) {
      console.info('[HMAC] No signature found, allowing request (non-strict mode)');
      return {
        valid: true,
        payload,
        signatureFound: false,
        signatureValid: false,
      };
    }

    // Validate signature
    const signatureValid = await verifyHmacSignature(payload, signature, this.secret);

    if (!signatureValid) {
      console.warn('[HMAC] Invalid signature received');
      return {
        valid: false,
        payload,
        error: 'Invalid webhook signature',
        signatureFound: true,
        signatureValid: false,
      };
    }

    console.info('[HMAC] Signature validated successfully');
    return {
      valid: true,
      payload,
      signatureFound: true,
      signatureValid: true,
    };
  }

  /**
   * Creates a signature for a payload (useful for testing or outgoing webhooks).
   */
  async signPayload(payload: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.secret);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const payloadBytes = encoder.encode(payload);
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, payloadBytes);
    
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return `sha256=${signature}`;
  }
}

/**
 * Creates a webhook security middleware for Deno serve handlers.
 * 
 * Usage:
 * ```typescript
 * const validateWebhook = createWebhookValidator(Deno.env.get('WEBHOOK_SECRET')!);
 * 
 * serve(async (req) => {
 *   const validation = await validateWebhook(req);
 *   if (!validation.valid) {
 *     return new Response(validation.error, { status: 401 });
 *   }
 *   const payload = JSON.parse(validation.payload!);
 *   // ... handle webhook
 * });
 * ```
 */
export function createWebhookValidator(secret: string, strictMode = false) {
  const service = new WebhookSecurityService(secret, strictMode);
  return (req: Request) => service.validateRequest(req);
}
