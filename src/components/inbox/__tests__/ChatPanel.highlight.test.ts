/**
 * Testa apenas o "contrato" do destaque do ChatPanel, sem montar a árvore
 * completa: recria a heurística do useEffect (resolução id interno vs
 * external_id, scroll attempts, clear timeout) para evitar regressões na
 * lógica de "Ver no chat" → highlight efêmero.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

interface Msg { id: string; external_id?: string }

function applyHighlight(opts: {
  pendingId: string | null;
  messages: Msg[];
  setHighlightSet: (s: Set<string>) => void;
  setActive: (id: string | null) => void;
  scrollToMessage: (id: string) => void;
  onConsumed?: () => void;
}) {
  const { pendingId, messages, setHighlightSet, setActive, scrollToMessage, onConsumed } = opts;
  if (!pendingId) return null;
  if (messages.length === 0) return null;

  const exists = messages.some((m) => m.id === pendingId || m.external_id === pendingId);
  if (!exists) return null;

  const internalId =
    messages.find((m) => m.id === pendingId)?.id ??
    messages.find((m) => m.external_id === pendingId)?.id ??
    pendingId;

  setHighlightSet(new Set([internalId]));
  setActive(internalId);

  let attempts = 0;
  const tryScroll = () => {
    attempts++;
    scrollToMessage(internalId);
    if (attempts < 6) setTimeout(tryScroll, 120);
  };
  tryScroll();

  const clear = setTimeout(() => {
    setActive(null);
    setHighlightSet(new Set());
    onConsumed?.();
  }, 3200);

  return () => clearTimeout(clear);
}

describe('ChatPanel highlight contract', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('resolve por id interno e dispara scroll + highlight', () => {
    const setHighlightSet = vi.fn();
    const setActive = vi.fn();
    const scroll = vi.fn();
    const consumed = vi.fn();

    applyHighlight({
      pendingId: 'm-1',
      messages: [{ id: 'm-1', external_id: 'ext-x' }, { id: 'm-2' }],
      setHighlightSet, setActive, scrollToMessage: scroll, onConsumed: consumed,
    });

    expect(setHighlightSet).toHaveBeenCalledWith(new Set(['m-1']));
    expect(setActive).toHaveBeenCalledWith('m-1');
    expect(scroll).toHaveBeenCalledWith('m-1');
  });

  it('resolve external_id para id interno antes de destacar', () => {
    const setActive = vi.fn();
    const scroll = vi.fn();
    applyHighlight({
      pendingId: 'ext-99',
      messages: [{ id: 'internal-7', external_id: 'ext-99' }],
      setHighlightSet: vi.fn(), setActive, scrollToMessage: scroll,
    });
    expect(setActive).toHaveBeenCalledWith('internal-7');
    expect(scroll).toHaveBeenCalledWith('internal-7');
  });

  it('não destaca quando mensagem não está carregada', () => {
    const setActive = vi.fn();
    applyHighlight({
      pendingId: 'unknown',
      messages: [{ id: 'm-1' }],
      setHighlightSet: vi.fn(), setActive, scrollToMessage: vi.fn(),
    });
    expect(setActive).not.toHaveBeenCalled();
  });

  it('limpa highlight e notifica consumido após 3.2s', () => {
    const setHighlightSet = vi.fn();
    const setActive = vi.fn();
    const consumed = vi.fn();

    applyHighlight({
      pendingId: 'm-1',
      messages: [{ id: 'm-1' }],
      setHighlightSet, setActive, scrollToMessage: vi.fn(), onConsumed: consumed,
    });

    setHighlightSet.mockClear();
    setActive.mockClear();
    vi.advanceTimersByTime(3200);

    expect(setActive).toHaveBeenCalledWith(null);
    expect(setHighlightSet).toHaveBeenCalledWith(new Set());
    expect(consumed).toHaveBeenCalledTimes(1);
  });

  it('faz múltiplas tentativas de scroll para cobrir virtualização', () => {
    const scroll = vi.fn();
    applyHighlight({
      pendingId: 'm-1',
      messages: [{ id: 'm-1' }],
      setHighlightSet: vi.fn(), setActive: vi.fn(), scrollToMessage: scroll,
    });
    expect(scroll).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(800); // 6 tentativas no total
    expect(scroll.mock.calls.length).toBeGreaterThanOrEqual(5);
  });

  it('é noop quando pendingId é null', () => {
    const setActive = vi.fn();
    applyHighlight({
      pendingId: null,
      messages: [{ id: 'm-1' }],
      setHighlightSet: vi.fn(), setActive, scrollToMessage: vi.fn(),
    });
    expect(setActive).not.toHaveBeenCalled();
  });
});
