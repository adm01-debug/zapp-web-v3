/**
 * useDedupeLoadingByKey — Sincroniza estado de loading cross-tab via crossTabDedupe.
 *
 * Mantém um `Set<string>` de chaves com fetch em andamento (local OU remoto)
 * que casam com o matcher fornecido. Atualiza em tempo real via
 * `subscribeDedupeStatus`, então spinners ficam consistentes entre abas:
 *
 *   - Aba A inicia `dedupedFetch('inbox:v2:initial:JID:100')` →
 *     Aba B (com mesmo matcher) recebe `phase: 'start'` e mostra spinner
 *     SEM disparar requisição própria.
 *   - Quando A conclui (result/error/release), B recebe `phase: 'end'`
 *     e esconde o spinner.
 *
 * Snapshot inicial: ao montar, lê `getInflightStatusKeys(matcher)` para
 * cobrir o caso em que o `start` ocorreu antes do componente subscrever.
 */
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import {
  subscribeDedupeStatus,
  getInflightStatusKeys,
  type DedupeStatusEvent,
} from '@/lib/realtime/crossTabDedupe';

export interface UseDedupeLoadingResult {
  /** Conjunto imutável de chaves atualmente em loading. */
  loadingKeys: ReadonlySet<string>;
  /** True se EXISTE pelo menos uma chave em loading no matcher. */
  isAnyLoading: boolean;
  /** Checa exatamente OU por prefixo. */
  isLoadingKey: (keyOrPrefix: string) => boolean;
}

/**
 * @param matcher  string exata, prefixo (`inbox:v2:initial:`) ou RegExp.
 *                 Reuse o mesmo matcher dos `inboxJidKeyPrefixes`.
 * @param enabled  desabilita listener quando false (ex.: sem jid selecionado).
 */
export function useDedupeLoadingByKey(
  matcher: string | RegExp,
  enabled = true,
): UseDedupeLoadingResult {
  // Mantemos um ref ao Set + uma versão monotônica para forçar re-render
  // via useSyncExternalStore sem clonar o Set inteiro a cada evento.
  const stateRef = useRef<{ keys: Set<string>; version: number }>({
    keys: new Set(),
    version: 0,
  });
  const listenersRef = useRef<Set<() => void>>(new Set());

  // Snapshot inicial + atualização ao trocar matcher/enabled.
  useEffect(() => {
    if (!enabled) {
      stateRef.current = { keys: new Set(), version: stateRef.current.version + 1 };
      listenersRef.current.forEach((l) => l());
      return;
    }
    const initial = getInflightStatusKeys(matcher);
    stateRef.current = {
      keys: new Set(initial.map((e) => e.key)),
      version: stateRef.current.version + 1,
    };
    listenersRef.current.forEach((l) => l());

    const unsub = subscribeDedupeStatus(matcher, (e: DedupeStatusEvent) => {
      const next = new Set(stateRef.current.keys);
      if (e.phase === 'start') {
        if (next.has(e.key)) return; // sem mudança → evita re-render
        next.add(e.key);
      } else {
        if (!next.has(e.key)) return;
        next.delete(e.key);
      }
      stateRef.current = { keys: next, version: stateRef.current.version + 1 };
      listenersRef.current.forEach((l) => l());
    });
    return unsub;
    // matcher pode ser RegExp; caller deve memoizar para evitar re-subscribes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, matcher instanceof RegExp ? matcher.source : String(matcher)]);

  const subscribe = useMemo(
    () => (cb: () => void) => {
      listenersRef.current.add(cb);
      return () => listenersRef.current.delete(cb);
    },
    [],
  );
  const getSnapshot = () => stateRef.current.version;
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const keys = stateRef.current.keys;
  return {
    loadingKeys: keys,
    isAnyLoading: keys.size > 0,
    isLoadingKey: (k: string) => {
      if (keys.has(k)) return true;
      // Match por prefixo: útil para checar "qualquer initial deste jid".
      for (const existing of keys) if (existing.startsWith(k)) return true;
      return false;
    },
  };
}
