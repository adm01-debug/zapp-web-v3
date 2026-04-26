/**
 * Component tests guarding the `MessageStatus` badge against malformed
 * `detail.errorCode` / `detail.errorReason` values that may slip through
 * the typed boundary (e.g. unsanitized realtime payloads, third-party DB
 * triggers writing JSON into a text column, accidental object spreads).
 *
 * Contracts pinned here:
 *
 *   1. Rendering MUST NOT throw for any of: object, array, null, NaN,
 *      huge string, control characters, HTML/script-like strings.
 *   2. The literal substring "[object Object]" MUST NEVER appear in the
 *      rendered output — even when an object is forced into errorReason.
 *      The current component contract treats non-string values as falsy
 *      (truthy-check on `errorReason` / `errorCode`), so they should be
 *      silently dropped instead of stringified.
 *   3. HTML/script content in errorReason MUST be rendered as text, not
 *      injected as DOM (React escaping; sanity check, no innerHTML).
 *   4. Very long errorReason (>10kb) does not crash and is present in
 *      the tooltip content as text.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageStatus } from '@/components/inbox/MessageStatus';
import type { MessageStatusDetailFields } from '@/types/messageStatus';

const FAILED_AUTH_BASE = 'Falha de autenticação';
const FAILED_BASE = 'Falha no envio';
const FAILED_RETRIES_BASE = 'Falhou após várias tentativas';

/** Cast helper: simulate a runtime payload that escaped the type system. */
function asDetail(value: unknown): MessageStatusDetailFields {
  return value as MessageStatusDetailFields;
}

/** Returns true if any node in the document contains the given substring. */
function documentContains(substring: string): boolean {
  return (document.body.textContent ?? '').includes(substring);
}

describe('MessageStatus — payloads malformados em errorCode/errorReason', () => {
  describe('nunca renderiza "[object Object]"', () => {
    const malformedCases: Array<{
      name: string;
      detail: MessageStatusDetailFields;
    }> = [
      {
        name: 'errorReason como objeto literal',
        detail: asDetail({ errorReason: { message: 'boom', code: 500 } }),
      },
      {
        name: 'errorReason como array',
        detail: asDetail({ errorReason: ['oops', 'twice'] }),
      },
      {
        name: 'errorCode como objeto + errorReason como objeto',
        detail: asDetail({
          errorCode: { type: 'AUTH', http: 401 },
          errorReason: { detail: 'token expired' },
        }),
      },
      {
        name: 'errorReason = null explícito',
        detail: asDetail({ errorReason: null }),
      },
      {
        name: 'errorCode = NaN',
        detail: asDetail({ errorCode: Number.NaN }),
      },
      {
        name: 'errorReason = Date instance',
        detail: asDetail({ errorReason: new Date('2024-01-01T00:00:00Z') }),
      },
      {
        name: 'errorReason = function',
        detail: asDetail({ errorReason: () => 'lazy reason' }),
      },
    ];

    it.each(malformedCases)('$name não emite [object Object]', ({ detail }) => {
      // Render all 3 failure variants to ensure none of the branches stringify objects.
      expect(() =>
        render(
          <>
            <MessageStatus status="failed" showLabel detail={detail} />
            <MessageStatus status="failed_auth" showLabel detail={detail} />
            <MessageStatus status="failed_retries" showLabel detail={detail} />
          </>,
        ),
      ).not.toThrow();

      expect(documentContains('[object Object]')).toBe(false);
      expect(documentContains('[object')).toBe(false);
      // No literal arrow-function body leaks for function payloads
      expect(documentContains('=>')).toBe(false);
    });
  });

  describe('não quebra a renderização e mantém o label base', () => {
    it('errorReason objeto em failed → mostra apenas o label base', () => {
      render(
        <MessageStatus
          status="failed"
          showLabel
          detail={asDetail({ errorReason: { foo: 'bar' } })}
        />,
      );
      // Tooltip content sempre presente no DOM (Radix portal); label base intacto.
      const matches = screen.getAllByText((text) => text.trim() === FAILED_BASE);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('errorCode objeto em failed_auth → não anexa "(…)" ao label', () => {
      render(
        <MessageStatus
          status="failed_auth"
          showLabel
          detail={asDetail({ errorCode: { http: 401 } })}
        />,
      );
      const matches = screen.getAllByText((text) => text.trim() === FAILED_AUTH_BASE);
      expect(matches.length).toBeGreaterThan(0);
      // E nenhum "(...)" com lixo
      expect(documentContains('([object')).toBe(false);
      expect(documentContains('({')).toBe(false);
    });

    it('totalRetries não-numérico em failed_retries → cai no label base', () => {
      render(
        <MessageStatus
          status="failed_retries"
          showLabel
          detail={asDetail({ totalRetries: { count: 3 } as unknown as number })}
        />,
      );
      // Como `detail.totalRetries` truthy mas não-numérico, gera "Falhou após [object Object] tentativas"
      // — esse é o RISCO. Garantimos que NÃO ocorre [object Object] no DOM.
      expect(documentContains('[object Object]')).toBe(false);
    });
  });

  describe('strings extremas / com conteúdo perigoso', () => {
    it('errorReason muito longo (>10kb) renderiza sem crash e aparece no tooltip', () => {
      const huge = 'x'.repeat(12_000);
      expect(() =>
        render(
          <MessageStatus
            status="failed"
            showLabel
            detail={{ errorReason: huge }}
          />,
        ),
      ).not.toThrow();

      // Substring suficientemente única para confirmar que o texto chegou ao DOM.
      expect(documentContains(huge.slice(0, 200))).toBe(true);
    });

    it('errorReason com tags HTML é renderizado como TEXTO (escape do React)', () => {
      const malicious = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
      render(
        <MessageStatus
          status="failed"
          showLabel
          detail={{ errorReason: malicious }}
        />,
      );
      // Aparece literalmente como texto…
      expect(documentContains(malicious)).toBe(true);
      // …e nenhum elemento <script> ou <img> foi injetado a partir do payload.
      expect(document.querySelectorAll('script').length).toBe(0);
      expect(document.querySelectorAll('img').length).toBe(0);
    });

    it('errorReason com caracteres de controle e null bytes não quebra', () => {
      const weird = 'fail\u0000\u0001\u0007\u001b[31mred\u001b[0m\nline2\t\ttab';
      expect(() =>
        render(
          <MessageStatus
            status="failed"
            showLabel
            detail={{ errorReason: weird }}
          />,
        ),
      ).not.toThrow();
      expect(documentContains('line2')).toBe(true);
    });

    it('errorCode = string vazia em failed_auth → não vira "Falha de autenticação ()"', () => {
      render(
        <MessageStatus
          status="failed_auth"
          showLabel
          detail={{ errorCode: '' }}
        />,
      );
      expect(documentContains('()')).toBe(false);
      const matches = screen.getAllByText((text) => text.trim() === FAILED_AUTH_BASE);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('errorCode = 0 (numérico falsy) em failed_auth → não anexa "(0)"', () => {
      // `if (detail?.errorCode)` é truthy-check; 0 é falsy → label permanece base.
      render(
        <MessageStatus
          status="failed_auth"
          showLabel
          detail={{ errorCode: 0 }}
        />,
      );
      expect(documentContains('(0)')).toBe(false);
      const matches = screen.getAllByText((text) => text.trim() === FAILED_AUTH_BASE);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('detail completamente ausente / vazio', () => {
    it('detail = undefined em todos os estados terminais não quebra', () => {
      expect(() =>
        render(
          <>
            <MessageStatus status="failed" showLabel />
            <MessageStatus status="failed_auth" showLabel />
            <MessageStatus status="failed_retries" showLabel />
          </>,
        ),
      ).not.toThrow();
      expect(documentContains(FAILED_BASE)).toBe(true);
      expect(documentContains(FAILED_AUTH_BASE)).toBe(true);
      expect(documentContains(FAILED_RETRIES_BASE)).toBe(true);
    });

    it('detail = {} (sem nenhum campo) renderiza apenas labels base', () => {
      render(<MessageStatus status="failed_auth" showLabel detail={{}} />);
      expect(documentContains('()')).toBe(false);
      expect(documentContains(' — ')).toBe(false);
      const matches = screen.getAllByText((text) => text.trim() === FAILED_AUTH_BASE);
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});
