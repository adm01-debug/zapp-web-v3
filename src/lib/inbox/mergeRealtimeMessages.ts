/**
 * mergeRealtimeMessages — Merge determinístico para mensagens do Inbox.
 *
 * Garante que qualquer fluxo que entregue mensagens (initial, poll, older,
 * sincronização cross-tab via BroadcastChannel ou push realtime) produza o
 * mesmo resultado final, sem inversões e sem duplicatas:
 *
 *   1. **Dedupe por `id`** — `id` é a chave canônica (UUID do banco). Se um
 *      `incoming` colide com `prev`, o registro `incoming` ganha (campos
 *      novos como `status_at` podem ter atualizado).
 *   2. **Ordem estável `(created_at ASC, id ASC)`** — `created_at` resolve a
 *      cronologia natural; `id` é tiebreaker para mensagens com timestamp
 *      idêntico (comum em rajadas de webhook). UUIDs são lexicograficamente
 *      estáveis, então a ordem é determinística entre abas.
 *
 * O caller passa apenas o array novo — não precisa pré-ordenar nem reverter
 * páginas `older` (o sort cobre).
 */

export interface MessageLike {
  id: string;
  /** ISO timestamp ou epoch ms — qualquer formato Date-parsável. */
  created_at: string | number | Date;
}

/** Comparador estável `(created_at ASC, id ASC)`. Exportado para reuso em testes. */
export function compareMessages<T extends MessageLike>(a: T, b: T): number {
  const ta = toEpoch(a.created_at);
  const tb = toEpoch(b.created_at);
  if (ta !== tb) return ta - tb;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

function toEpoch(v: string | number | Date): number {
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v;
  // Strings ISO: Date.parse é suficiente — `created_at` do banco vem normalizado.
  // NaN (string inválida) cai para 0 para não quebrar o sort, ainda mantendo ordem por id.
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Mescla `incoming` em `prev`, deduplicando por `id` (incoming wins) e
 * ordenando o resultado por `(created_at, id)`. Retorna `prev` se nada mudar
 * (mesma referência), permitindo que callers React saiam cedo do setState.
 *
 * Optimization: se `incoming` está vazio ou todos os ids já estão em `prev`
 * com o mesmo conteúdo (shallow), preserva a referência.
 */
export function mergeRealtimeMessages<T extends MessageLike>(
  prev: readonly T[],
  incoming: readonly T[],
): T[] | readonly T[] {
  if (!incoming || incoming.length === 0) return prev;

  // Mapa por id para resolver colisões (incoming wins).
  const byId = new Map<string, T>();
  for (const m of prev) byId.set(m.id, m);
  let mutated = false;
  for (const m of incoming) {
    const existing = byId.get(m.id);
    if (!existing) {
      byId.set(m.id, m);
      mutated = true;
    } else if (existing !== m) {
      // Substitui apenas se o objeto for diferente — `incoming` mais recente.
      byId.set(m.id, m);
      mutated = true;
    }
  }
  if (!mutated && byId.size === prev.length) return prev;

  const merged = Array.from(byId.values()).sort(compareMessages);

  // Se a ordem e o conteúdo não mudaram, devolve `prev` para preservar referência.
  if (merged.length === prev.length) {
    let same = true;
    for (let i = 0; i < merged.length; i++) {
      if (merged[i] !== prev[i]) { same = false; break; }
    }
    if (same) return prev;
  }

  return merged;
}

/**
 * Devolve o `created_at` máximo do array (string original do registro mais
 * recente). Útil para atualizar cursors `lastSeen` de forma robusta mesmo
 * quando o input chegou fora de ordem.
 */
export function maxCreatedAt<T extends MessageLike>(
  messages: readonly T[],
): string | number | Date | null {
  if (!messages.length) return null;
  let bestIdx = 0;
  let bestEpoch = toEpoch(messages[0].created_at);
  for (let i = 1; i < messages.length; i++) {
    const t = toEpoch(messages[i].created_at);
    if (t > bestEpoch) {
      bestEpoch = t;
      bestIdx = i;
    }
  }
  return messages[bestIdx].created_at;
}
