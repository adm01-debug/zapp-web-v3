/**
 * gmailOAuth.ts — Utilitários OAuth2 Gmail para o cliente
 *
 * Constrói URLs de autorização, verifica estados PKCE e
 * processa callbacks OAuth de forma segura.
 */

const GMAIL_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

// ── PKCE helpers ───────────────────────────────────────────────────────

function base64URLEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function generateCodeVerifier(): Promise<string> {
  const array = crypto.getRandomValues(new Uint8Array(32));
  return base64URLEncode(array.buffer);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(digest);
}

// ── State seguro ───────────────────────────────────────────────────────

export function generateOAuthState(): string {
  const array = crypto.getRandomValues(new Uint8Array(16));
  return base64URLEncode(array.buffer);
}

// ── URL de autorização ─────────────────────────────────────────────────

export interface OAuthURLOptions {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  loginHint?: string;
}

export function buildGmailAuthURL(opts: OAuthURLOptions): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: opts.state,
    code_challenge: opts.codeChallenge,
    code_challenge_method: 'S256',
    ...(opts.loginHint ? { login_hint: opts.loginHint } : {}),
  });

  return `${GMAIL_AUTH_ENDPOINT}?${params.toString()}`;
}

// ── Session Storage helpers (PKCE state) ───────────────────────────────

const PKCE_KEY = 'gmail_oauth_pkce';
const STATE_KEY = 'gmail_oauth_state';

export function savePKCEState(state: string, verifier: string): void {
  try {
    sessionStorage.setItem(STATE_KEY, state);
    sessionStorage.setItem(PKCE_KEY, verifier);
  } catch { /* ignore quota errors */ }
}

export function retrievePKCEState(): { state: string; verifier: string } | null {
  try {
    const state = sessionStorage.getItem(STATE_KEY);
    const verifier = sessionStorage.getItem(PKCE_KEY);
    if (state && verifier) return { state, verifier };
  } catch { /* ignore */ }
  return null;
}

export function clearPKCEState(): void {
  try {
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(PKCE_KEY);
  } catch { /* ignore */ }
}

// ── Validação de callback ──────────────────────────────────────────────

export interface OAuthCallbackParams {
  code?: string | null;
  state?: string | null;
  error?: string | null;
  error_description?: string | null;
}

export function parseOAuthCallback(searchParams: URLSearchParams): OAuthCallbackParams {
  return {
    code: searchParams.get('code'),
    state: searchParams.get('state'),
    error: searchParams.get('error'),
    error_description: searchParams.get('error_description'),
  };
}

export function validateOAuthState(receivedState: string | null): boolean {
  const saved = retrievePKCEState();
  if (!saved || !receivedState) return false;
  return saved.state === receivedState;
}

// ── Popup OAuth helper ─────────────────────────────────────────────────

export interface PopupOAuthOptions {
  url: string;
  width?: number;
  height?: number;
  onSuccess: (email: string, accountId: string) => void;
  onError?: (error: string) => void;
}

export function openOAuthPopup(opts: PopupOAuthOptions): Window | null {
  const { width = 520, height = 640, url } = opts;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  const popup = window.open(
    url,
    'gmail-oauth',
    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
  );

  const handleMessage = (event: MessageEvent) => {
    // Valida origin para segurança
    if (event.origin !== window.location.origin) return;

    if (event.data?.type === 'gmail-oauth-success') {
      window.removeEventListener('message', handleMessage);
      popup?.close();
      opts.onSuccess(event.data.email, event.data.accountId);
    } else if (event.data?.type === 'gmail-oauth-error') {
      window.removeEventListener('message', handleMessage);
      popup?.close();
      opts.onError?.(event.data.error ?? 'OAuth falhou');
    }
  };

  window.addEventListener('message', handleMessage);

  // Cleanup se popup fechar manualmente
  const interval = setInterval(() => {
    if (popup?.closed) {
      clearInterval(interval);
      window.removeEventListener('message', handleMessage);
    }
  }, 500);

  return popup;
}
