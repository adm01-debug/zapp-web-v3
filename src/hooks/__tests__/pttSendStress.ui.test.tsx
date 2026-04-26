/**
 * UI stress test — envio de PTT no modo FATOR X (USE_EXTERNAL_DB=true).
 *
 * Cobre 120 iterações de envio de áudio simulando o ciclo real:
 *  1. `sendExternalAudio` é mockado e devolve uma bolha otimista
 *     (`optimistic:*` id, `message_type: 'audio'`, `status: 'sending'`).
 *  2. O componente sob teste insere a otimista via `addMessage` e a renderiza
 *     com `data-testid="bubble-optimistic"`.
 *  3. Disparamos um "webhook tick" que entrega a versão canônica
 *     (`external_id` real) e roda o `reconcileOptimistic` real do
 *     `useExternalEvolution` — exatamente como o cursor de poll faz.
 *  4. Asseguramos que a otimista some do DOM e a canônica
 *     (`data-testid="bubble-canonical"`) aparece com o mesmo `external_id`.
 *
 * Por iteração validamos:
 *   - bolha otimista presente IMEDIATAMENTE após o envio;
 *   - bolha canônica presente após o tick do webhook;
 *   - bolha otimista some (sem duplicar bubbles);
 *   - `media_url` é herdado quando o canônico chega sem URL final.
 *
 * Também validamos a contagem agregada ao final: 120 canônicas, 0 otimistas.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, within } from '@testing-library/react';
import { useState, useCallback } from 'react';
import type { RealtimeMessage } from '@/hooks/useRealtimeMessages';
import { reconcileOptimistic } from '@/hooks/useExternalEvolution';
import * as externalSender from '@/hooks/realtime/externalMessageSender';

const REMOTE_JID = '5511999998888@s.whatsapp.net';
const ITERATIONS = 120;

function makeOptimisticAudioBubble(seq: number, mediaUrl: string): RealtimeMessage {
  const now = new Date().toISOString();
  return {
    id: `optimistic:${Date.now()}:${seq}:${Math.random().toString(36).slice(2, 8)}`,
    contact_id: REMOTE_JID,
    agent_id: 'system',
    content: '[Áudio]',
    sender: 'agent',
    message_type: 'audio',
    media_url: mediaUrl,
    is_read: true,
    status: 'sending',
    status_updated_at: now,
    created_at: now,
    updated_at: now,
    external_id: null,
    whatsapp_connection_id: null,
    transcription: null,
    transcription_status: null,
    is_deleted: false,
  };
}

function makeCanonicalFromOptimistic(opt: RealtimeMessage, externalId: string, opts: { withMediaUrl: boolean }): RealtimeMessage {
  // O webhook frequentemente chega SEM media_url final (ainda em decrypt).
  // Quando isso acontece, o `reconcileOptimistic` deve herdar a media_url
  // da otimista — esta é uma das garantias do teste.
  return {
    ...opt,
    id: `canonical-${externalId}`,
    external_id: externalId,
    media_url: opts.withMediaUrl ? opt.media_url : null,
    status: 'delivered',
  };
}

/** Harness que renderiza as mensagens com testids estáveis. */
function PttHarness({
  initialMessages = [],
  onReady,
}: {
  initialMessages?: RealtimeMessage[];
  onReady: (api: {
    addOptimistic: (m: RealtimeMessage) => void;
    deliverWebhook: (canonical: RealtimeMessage[]) => void;
    snapshot: () => RealtimeMessage[];
  }) => void;
}) {
  const [messages, setMessages] = useState<RealtimeMessage[]>(initialMessages);

  const addOptimistic = useCallback((m: RealtimeMessage) => {
    setMessages((prev) => {
      if (prev.some((x) => x.id === m.id)) return prev;
      return [...prev, m];
    });
  }, []);

  const deliverWebhook = useCallback((canonical: RealtimeMessage[]) => {
    setMessages((prev) => {
      const { filteredPrev, additions } = reconcileOptimistic(prev, canonical);
      return [...filteredPrev, ...additions];
    });
  }, []);

  // Expose API via callback ref (evita useEffect/timing issues).
  const apiRef = useCallback(
    (_node: HTMLDivElement | null) => {
      onReady({
        addOptimistic,
        deliverWebhook,
        snapshot: () => messages,
      });
    },
    [addOptimistic, deliverWebhook, messages, onReady],
  );

  return (
    <div ref={apiRef} data-testid="ptt-list">
      {messages.map((m) => {
        const isOptimistic = m.id.startsWith('optimistic:');
        return (
          <div
            key={m.id}
            data-testid={isOptimistic ? 'bubble-optimistic' : 'bubble-canonical'}
            data-message-id={m.id}
            data-external-id={m.external_id ?? ''}
            data-media-url={m.media_url ?? ''}
            data-status={m.status ?? ''}
          >
            {m.content}
          </div>
        );
      })}
    </div>
  );
}

describe('PTT FATOR X — stress UI (120 iterações)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('envia 120 PTTs, mostra bolha otimista e reconcilia após webhook', async () => {
    // Mock do sender externo — simula upload + invoke + bolha otimista.
    // Alternamos cenários reais:
    //   - seq par:   sender resolveu `external_id` (proxy devolveu `key.id`).
    //   - seq ímpar: sender NÃO resolveu (proxy devolveu envelope sem key) →
    //                a otimista fica sem external_id e a reconciliação cai no
    //                fallback de mídia (sender + message_type + janela).
    let seq = 0;
    const sendSpy = vi.spyOn(externalSender, 'sendExternalAudio').mockImplementation(
      async (_jid: string) => {
        seq += 1;
        const optimistic = makeOptimisticAudioBubble(
          seq,
          `https://signed.example/audio/${seq}.webm?token=abc`,
        );
        const externalId = `WAID-${seq.toString().padStart(5, '0')}`;
        if (seq % 2 === 0) {
          optimistic.external_id = externalId;
          optimistic.status = 'sent';
        }
        return { optimistic, externalId };
      },
    );

    let api: {
      addOptimistic: (m: RealtimeMessage) => void;
      deliverWebhook: (canonical: RealtimeMessage[]) => void;
      snapshot: () => RealtimeMessage[];
    } | null = null;

    const { container } = render(
      <PttHarness onReady={(a) => { api = a; }} />,
    );
    expect(api).not.toBeNull();

    const queryAll = (testId: string) =>
      Array.from(container.querySelectorAll(`[data-testid="${testId}"]`));

    // Sanity: lista vazia.
    expect(queryAll('bubble-optimistic')).toHaveLength(0);
    expect(queryAll('bubble-canonical')).toHaveLength(0);

    const fakeBlob = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' });

    for (let i = 1; i <= ITERATIONS; i++) {
      // ETAPA 1 — envio do PTT (igual ao useRealtimeInbox.handleSendAudio).
      const { optimistic, externalId } = await externalSender.sendExternalAudio(REMOTE_JID, fakeBlob);
      expect(externalId).toBe(`WAID-${i.toString().padStart(5, '0')}`);

      await act(async () => {
        api!.addOptimistic(optimistic);
      });

      // ASSERT — bolha otimista aparece imediatamente no DOM.
      const optimisticEls = queryAll('bubble-optimistic');
      const matchOpt = optimisticEls.find(
        (el) => el.getAttribute('data-message-id') === optimistic.id,
      );
      expect(matchOpt, `iteração ${i}: bolha otimista deveria existir no DOM`).toBeTruthy();
      // Quando o sender resolveu o external_id (i par), ele já vem na bolha.
      // Quando não (i ímpar), a bolha fica sem external_id e a reconciliação
      // depende do fallback de mídia (sender + message_type + janela).
      const expectedOptExtId = i % 2 === 0 ? externalId : '';
      expect(matchOpt!.getAttribute('data-external-id')).toBe(expectedOptExtId);
      expect(matchOpt!.getAttribute('data-media-url')).toContain('signed.example');

      // ETAPA 2 — webhook chega (alternamos cenários para cobrir ambos):
      //   - i ímpar: canonical SEM media_url (testa herança via fallback);
      //   - i par:   canonical COM media_url próprio (match por external_id).
      const canonical = makeCanonicalFromOptimistic(optimistic, externalId!, {
        withMediaUrl: i % 2 === 0,
      });

      await act(async () => {
        api!.deliverWebhook([canonical]);
      });

      // ASSERT — otimista some, canônica aparece sem duplicar.
      const optimisticAfter = queryAll('bubble-optimistic').find(
        (el) => el.getAttribute('data-message-id') === optimistic.id,
      );
      expect(optimisticAfter, `iteração ${i}: otimista deveria sumir após webhook`).toBeFalsy();

      const canonicalEls = queryAll('bubble-canonical').filter(
        (el) => el.getAttribute('data-external-id') === externalId,
      );
      expect(canonicalEls, `iteração ${i}: deveria existir EXATAMENTE 1 canônica`).toHaveLength(1);

      // ASSERT — herança de media_url quando o webhook não traz URL.
      const mediaUrl = canonicalEls[0].getAttribute('data-media-url');
      expect(mediaUrl, `iteração ${i}: media_url não pode ser vazio (herança falhou)`).toBeTruthy();
      expect(mediaUrl).toContain('signed.example');
    }

    // ASSERT FINAL — 120 canônicas, 0 otimistas, sender chamado N vezes.
    const finalOpt = queryAll('bubble-optimistic');
    const finalCanonical = queryAll('bubble-canonical');
    expect(finalOpt).toHaveLength(0);
    expect(finalCanonical).toHaveLength(ITERATIONS);
    expect(sendSpy).toHaveBeenCalledTimes(ITERATIONS);

    // Garantia adicional: cada externalId aparece exatamente uma vez (sem dupes).
    const list = within(container.querySelector('[data-testid="ptt-list"]') as HTMLElement);
    const allCanonical = list.queryAllByTestId('bubble-canonical');
    const externalIds = allCanonical.map((el) => el.getAttribute('data-external-id'));
    expect(new Set(externalIds).size).toBe(ITERATIONS);
  }, 30_000);

  it('ignora webhook duplicado para o mesmo external_id (idempotência)', async () => {
    let api: {
      addOptimistic: (m: RealtimeMessage) => void;
      deliverWebhook: (canonical: RealtimeMessage[]) => void;
      snapshot: () => RealtimeMessage[];
    } | null = null;

    const { container } = render(<PttHarness onReady={(a) => { api = a; }} />);
    const queryAll = (id: string) => Array.from(container.querySelectorAll(`[data-testid="${id}"]`));

    const opt = makeOptimisticAudioBubble(1, 'https://signed.example/audio/1.webm');
    opt.external_id = 'WAID-DUPE';
    const canonical = makeCanonicalFromOptimistic(opt, 'WAID-DUPE', { withMediaUrl: true });

    await act(async () => { api!.addOptimistic(opt); });
    await act(async () => { api!.deliverWebhook([canonical]); });
    await act(async () => { api!.deliverWebhook([canonical]); }); // duplicado
    await act(async () => { api!.deliverWebhook([canonical]); }); // tríplice

    expect(queryAll('bubble-optimistic')).toHaveLength(0);
    expect(queryAll('bubble-canonical')).toHaveLength(1);
  });
});
