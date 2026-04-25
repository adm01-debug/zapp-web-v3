/**
 * inboxDedupeConfig — Configuração CENTRAL de TTLs/timeouts/retry do dedupe do Inbox.
 *
 * Toda janela de tempo usada por `dedupedFetch` no fluxo do Inbox vive aqui.
 * Ajuste num único lugar quando o `POLL_INTERVAL` mudar — os call sites
 * (sidebar, initial, poll, older) recalculam automaticamente via os getters.
 *
 * Convenções:
 *   - `lockTtl`: máximo razoável que um fetch pode levar (líder segura o lock).
 *   - `resultTtl`: por quanto tempo abas espectadoras reaproveitam o cache.
 *     Para o **poll**, mantém `< POLL_INTERVAL` para que o próximo ciclo dispare.
 *     Para sidebar/initial, vale a pena reusar entre re-renders/troca rápida.
 *   - `waitTimeout`: quanto uma aba espectadora aguarda o broadcast da líder
 *     antes de cair em fallback (geralmente ~80% do `lockTtl`).
 *   - `retry`: backoff aplicado quando o fetcher falha; `null` = sem retry.
 *
 * Não importe constantes daqui em testes unitários do dedupe — passe valores
 * fixos. Esta config é específica do Inbox.
 */

import type { DedupeOptions, DedupeRetryOptions } from '@/lib/realtime/crossTabDedupe';

// ─── Knobs de domínio ────────────────────────────────────────────────────────
/** Intervalo de polling do inbox (ms). Driver primário dos TTLs derivados. */
export const POLL_INTERVAL_MS = 5_000;

/** Janela de dias da sidebar (lookback). */
export const SIDEBAR_DAYS_BACK = 7;

/** Limite de mensagens da sidebar. */
export const SIDEBAR_LIMIT = 200;

/** Tamanho de página em conversas individuais (initial/older). */
export const CONVERSATION_PAGE_SIZE = 100;

// ─── Presets de retry compartilhados ─────────────────────────────────────────
const RETRY_USER_FACING: DedupeRetryOptions = {
  maxRetries: 2,
  baseDelayMs: 400,
  maxDelayMs: 3_000,
};

const RETRY_SIDEBAR: DedupeRetryOptions = {
  maxRetries: 2,
  baseDelayMs: 300,
  maxDelayMs: 2_000,
};

// ─── Builders de DedupeOptions por call site ─────────────────────────────────
/**
 * Sidebar — janela compartilhada por todas as abas; reusar até quase o próximo poll.
 * `resultTtl` fica logo abaixo de `POLL_INTERVAL` para o ciclo seguinte revalidar.
 */
export function getSidebarDedupeOptions(): DedupeOptions {
  return {
    lockTtl: 8_000,
    resultTtl: POLL_INTERVAL_MS - 500,
    waitTimeout: 6_000,
    retry: RETRY_SIDEBAR,
  };
}

/**
 * Initial fetch ao abrir um chat — pode levar mais (até 100 msgs + media meta).
 * Cache curto (15s) cobre troca rápida entre o mesmo contato em múltiplas abas
 * sem desatualizar o histórico ao voltar pra ele depois.
 */
export function getInitialDedupeOptions(): DedupeOptions {
  return {
    lockTtl: 10_000,
    resultTtl: 15_000,
    waitTimeout: 8_000,
    retry: RETRY_USER_FACING,
  };
}

/**
 * Poll cursor-forward — `resultTtl` precisa ficar < `POLL_INTERVAL` para que
 * a próxima iteração dispare normalmente. Sem retry: o próximo poll já cobre.
 */
export function getPollDedupeOptions(): DedupeOptions {
  return {
    lockTtl: 4_000,
    resultTtl: POLL_INTERVAL_MS - 1_000,
    waitTimeout: 3_000,
    // Intencional: poll não retenta — o próximo ciclo (5s) é o retry natural.
  };
}

/**
 * Older page (scroll up) — usuário pode cancelar via `AbortController`.
 * O caller deve compor `shouldRetry` para honrar o sinal.
 */
export function getOlderDedupeOptions(opts?: {
  shouldRetry?: DedupeRetryOptions['shouldRetry'];
}): DedupeOptions {
  return {
    lockTtl: 10_000,
    resultTtl: 30_000,
    waitTimeout: 8_000,
    retry: {
      ...RETRY_USER_FACING,
      ...(opts?.shouldRetry ? { shouldRetry: opts.shouldRetry } : {}),
    },
  };
}

/**
 * Helper somente leitura — útil em painéis de diagnóstico para exibir
 * a configuração corrente sem importar todos os getters.
 */
export function snapshotInboxDedupeConfig() {
  return {
    pollIntervalMs: POLL_INTERVAL_MS,
    sidebar: getSidebarDedupeOptions(),
    initial: getInitialDedupeOptions(),
    poll: getPollDedupeOptions(),
    older: getOlderDedupeOptions(),
    pageSizes: {
      sidebarDaysBack: SIDEBAR_DAYS_BACK,
      sidebarLimit: SIDEBAR_LIMIT,
      conversationPageSize: CONVERSATION_PAGE_SIZE,
    },
  };
}
