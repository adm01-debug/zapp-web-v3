/**
 * providers/evolution/client.ts — Gateway HTTP único para a Evolution API
 *
 * E67-E75 do Plano de Desacoplamento 100 Etapas.
 * TODAS as edge functions devem usar este client em vez de acessar
 * EVOLUTION_API_URL diretamente.
 *
 * Funcionalidades:
 * - Retry automático com backoff exponencial
 * - Timeout configurável
 * - Telemetria de fallback
 * - API Key lida de um único ponto
 * - Envelope versionado de request/response
 * - Circuit breaker (Dim-13): protege contra cascata de falhas
 * - W3C traceparent (Dim-10): rastreabilidade distribuída
 */

export interface EvolutionClientConfig {
  maxRetries?: number;
  timeoutMs?: number;
  instance?: string;
  traceparent?: string;
}

export interface EvolutionResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  retries?: number;
  circuitOpen?: boolean;
}

// ─── Circuit Breaker (Dim-13) ─────────────────────────────────────────────────
// Estado de módulo: persiste durante o warm do isolate Deno.
// Protege chamadas múltiplas dentro de uma invocação e entre invocações quentes.

const CIRCUIT_OPEN_THRESHOLD = 5;
const CIRCUIT_RECOVERY_MS = 30_000;

const _cb = {
  failures: 0,
  lastFailureAt: 0,
  isOpen: false,
};

function circuitIsOpen(): boolean {
  if (!_cb.isOpen) return false;
  if (Date.now() - _cb.lastFailureAt >= CIRCUIT_RECOVERY_MS) {
    _cb.isOpen = false;
    _cb.failures = 0;
    return false;
  }
  return true;
}

function circuitRecordFailure(): void {
  _cb.failures += 1;
  _cb.lastFailureAt = Date.now();
  if (_cb.failures >= CIRCUIT_OPEN_THRESHOLD) _cb.isOpen = true;
}

function circuitRecordSuccess(): void {
  _cb.failures = 0;
  _cb.isOpen = false;
}

// ─── W3C Traceparent (Dim-10) ─────────────────────────────────────────────────

function generateTraceparent(): string {
  const traceId = crypto.randomUUID().replace(/-/g, '');
  const randBytes = crypto.getRandomValues(new Uint8Array(8));
  const spanId = Array.from(randBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `00-${traceId}-${spanId}-01`;
}

export function getBaseUrl(): string {
  const url = Deno.env.get('EVOLUTION_API_URL');
  if (!url) throw new Error('EVOLUTION_API_URL not set');
  return url.replace(/\/$/, '');
}

function getApiKey(): string {
  const key = Deno.env.get('EVOLUTION_API_KEY');
  if (!key) throw new Error('EVOLUTION_API_KEY not set');
  return key;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Realiza uma chamada HTTP para a Evolution API com retry automático,
 * circuit breaker e W3C traceparent.
 */
export async function evolutionFetch<T = unknown>(
  path: string,
  options: RequestInit & EvolutionClientConfig = {},
): Promise<EvolutionResponse<T>> {
  // Circuit breaker: rejeita imediatamente se circuito estiver aberto
  if (circuitIsOpen()) {
    return {
      ok: false,
      status: 0,
      error: 'circuit-open: Evolution API temporariamente indisponível',
      retries: 0,
      circuitOpen: true,
    };
  }

  const { maxRetries = 2, timeoutMs = 30_000, instance, traceparent, ...fetchOpts } = options;
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();

  const url = instance
    ? `${baseUrl}/${instance}/${path.replace(/^\//, '')}`
    : `${baseUrl}/${path.replace(/^\//, '')}`;

  const headers = new Headers(fetchOpts.headers);
  headers.set('apikey', apiKey);
  headers.set('Content-Type', 'application/json');
  // W3C Trace Context (Dim-10): propaga ou gera novo traceparent
  headers.set('traceparent', traceparent ?? generateTraceparent());

  let lastError: string = '';
  let lastStatus = 0; // 0 = falha de rede/timeout (sem resposta HTTP)
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        ...fetchOpts,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json().catch(() => null) as T;
        circuitRecordSuccess();
        return { ok: true, status: res.status, data, retries: attempt };
      }

      lastStatus = res.status;
      lastError = `HTTP ${res.status}: ${await res.text().catch(() => '')}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    if (attempt < maxRetries) {
      await sleep(Math.min(500 * 2 ** attempt, 4_000));
    }
  }

  circuitRecordFailure();
  return { ok: false, status: lastStatus, error: lastError, retries: maxRetries };
}

// ─── Verbos de alto nível ────────────────────────────────────────────────────

export const evolutionClient = {
  /** Envia mensagem de texto */
  sendText: (instance: string, number: string, text: string, options?: EvolutionClientConfig) =>
    evolutionFetch('message/sendText/' + instance, {
      method: 'POST',
      body: JSON.stringify({ number, textMessage: { text } }),
      instance: undefined,
      ...options,
    }),

  /** Envia mídia (imagem/vídeo/áudio/documento) */
  sendMedia: (instance: string, payload: Record<string, unknown>, options?: EvolutionClientConfig) =>
    evolutionFetch(`message/sendMedia/${instance}`, {
      method: 'POST',
      body: JSON.stringify(payload),
      ...options,
    }),

  /** Envia sticker */
  sendSticker: (instance: string, number: string, stickerUrl: string, options?: EvolutionClientConfig) =>
    evolutionFetch(`message/sendSticker/${instance}`, {
      method: 'POST',
      body: JSON.stringify({ number, stickerMessage: { url: stickerUrl } }),
      ...options,
    }),

  /** Verifica status de conexão */
  getConnectionState: (instance: string, options?: EvolutionClientConfig) =>
    evolutionFetch(`instance/connectionState/${instance}`, { method: 'GET', ...options }),

  /** Busca QR Code */
  getQrCode: (instance: string, options?: EvolutionClientConfig) =>
    evolutionFetch(`instance/connect/${instance}`, { method: 'GET', ...options }),

  /** Reinicia instância */
  restartInstance: (instance: string, options?: EvolutionClientConfig) =>
    evolutionFetch(`instance/restart/${instance}`, { method: 'DELETE', ...options }),

  /** Lista instâncias */
  listInstances: (options?: EvolutionClientConfig) =>
    evolutionFetch('instance/fetchInstances', { method: 'GET', ...options }),

  /** Lista grupos */
  listGroups: (instance: string, options?: EvolutionClientConfig) =>
    evolutionFetch(`group/fetchAllGroups/${instance}?getParticipants=false`, {
      method: 'GET',
      ...options,
    }),

  /** Verifica se número é WhatsApp */
  checkWhatsApp: (instance: string, numbers: string[], options?: EvolutionClientConfig) =>
    evolutionFetch(`chat/whatsappNumbers/${instance}`, {
      method: 'POST',
      body: JSON.stringify({ numbers }),
      ...options,
    }),

  /** Busca avatar */
  getProfilePicture: (instance: string, number: string, options?: EvolutionClientConfig) =>
    evolutionFetch(`chat/fetchProfilePictureUrl/${instance}`, {
      method: 'POST',
      body: JSON.stringify({ number }),
      ...options,
    }),

  /** Generic GET */
  get: <T = unknown>(path: string, options?: EvolutionClientConfig) =>
    evolutionFetch<T>(path, { method: 'GET', ...options }),

  /** Generic POST */
  post: <T = unknown>(path: string, body: unknown, options?: EvolutionClientConfig) =>
    evolutionFetch<T>(path, { method: 'POST', body: JSON.stringify(body), ...options }),
};
