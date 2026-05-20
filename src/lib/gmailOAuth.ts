const GMAIL_OAUTH_RETURN_VIEW_KEY = 'gmail-oauth-return-view';
const GMAIL_OAUTH_RETURN_INTEGRATION_KEY = 'gmail-oauth-return-integration';
const PENDING_INTEGRATION_VIEW_KEY = 'pending-integration-view';

export interface GmailOAuthState {
  view: string;
  integrationView?: string;
}

function getSessionStorage() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

export function storeGmailOAuthReturnContext(view: string, integrationView = 'gmail') {
  const storage = getSessionStorage();
  if (!storage) return;

  storage.setItem(GMAIL_OAUTH_RETURN_VIEW_KEY, view);
  storage.setItem(GMAIL_OAUTH_RETURN_INTEGRATION_KEY, integrationView);
}

export function createGmailOAuthState(state: GmailOAuthState) {
  return JSON.stringify(state);
}

export function parseGmailOAuthState(value: string | null): GmailOAuthState | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as GmailOAuthState;

    if (!parsed?.view) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function consumeGmailOAuthReturnContext() {
  const storage = getSessionStorage();

  const view = storage?.getItem(GMAIL_OAUTH_RETURN_VIEW_KEY) || 'integrations';
  const integrationView = storage?.getItem(GMAIL_OAUTH_RETURN_INTEGRATION_KEY);

  storage?.removeItem(GMAIL_OAUTH_RETURN_VIEW_KEY);
  storage?.removeItem(GMAIL_OAUTH_RETURN_INTEGRATION_KEY);

  return { view, integrationView };
}

export function setPendingIntegrationView(view: string) {
  const storage = getSessionStorage();
  if (!storage) return;

  storage.setItem(PENDING_INTEGRATION_VIEW_KEY, view);
}

export function consumePendingIntegrationView() {
  const storage = getSessionStorage();
  const view = storage?.getItem(PENDING_INTEGRATION_VIEW_KEY) || null;

  storage?.removeItem(PENDING_INTEGRATION_VIEW_KEY);

  return view;
}