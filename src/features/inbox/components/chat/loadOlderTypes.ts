/**
 * Contrato dos callbacks de paginacao "carregar mensagens antigas".
 *
 * Regra:
 *  - Em MODO LOCAL (sem paginacao remota), os componentes consumidores devem
 *    receber `undefined` para AMBOS os callbacks. Isso desliga toda a
 *    maquinaria de scroll/cancelamento em `ChatMessagesArea`, evitando
 *    listeners ociosos, badges fantasma e re-renders esporios.
 *  - Em MODO EXTERNO (paginacao remota), ambos os callbacks devem ser
 *    fornecidos. Eles seguem um contrato "fire-and-forget": qualquer valor
 *    retornado e ignorado e nao deve ser consumido pelo chamador.
 *
 * Por que `Promise<void>` e nao `Promise<unknown>`?
 *  - Garante que implementacoes nao acidentalmente exponham detalhes internos
 *    (ex.: payload do fetch) atraves do tipo do callback.
 *  - Reflete fielmente o uso atual: o resultado e descartado via
 *    `Promise.resolve(onLoadOlder()).finally(...)`.
 */

/** Dispara o carregamento de mensagens mais antigas. Resultado ignorado. */
export type LoadOlderCallback = () => void | Promise<void>;

/** Cancela um carregamento em andamento. Sincrono, sem retorno. */
export type CancelLoadOlderCallback = () => void;

/**
 * Conjunto opcional de props relacionadas a paginacao "older".
 *
 * Use `LoadOlderProps` em interfaces de componentes para garantir que o par
 * `(onLoadOlder, onCancelLoadOlder)` seja tratado de forma consistente.
 *
 * Convenção:
 *  - Modo local:    onLoadOlder = undefined, onCancelLoadOlder = undefined,
 *                   loadingOlder = false (default), hasMoreOlder = false (default).
 *  - Modo externo:  ambos os callbacks definidos; loadingOlder/hasMoreOlder
 *                   refletem o estado real da fonte remota.
 */
export interface LoadOlderProps {
  onLoadOlder?: LoadOlderCallback;
  onCancelLoadOlder?: CancelLoadOlderCallback;
  loadingOlder?: boolean;
  hasMoreOlder?: boolean;
}
