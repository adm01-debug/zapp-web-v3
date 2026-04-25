/**
 * Testes para `openContactInChat` — utilitário de deep-link "Ver no chat".
 *
 * Cobre:
 *  - Resolução por `contactId` (curto-circuito, sem lookup).
 *  - Resolução por `remoteJid` (extrai phone, consulta `contacts`).
 *  - Resolução por `phone` direto.
 *  - Falha quando contato não existe (retorna false).
 *  - Hash trocado para #inbox.
 *  - Pending state (`__pendingOpenContactId` / `__pendingOpenChatTarget`).
 *  - Evento `open-contact-chat` despachado com `messageId` no detail.
 *  - `jidToPhone` parseando JIDs Whatsapp.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn((_table: string) => ({ select: selectMock }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => fromMock(table) },
}));

import { openContactInChat, jidToPhone } from '../openContactInChat';

describe('jidToPhone', () => {
  it('extrai dígitos de JID padrão', () => {
    expect(jidToPhone('5511999998888@s.whatsapp.net')).toBe('5511999998888');
  });
  it('aceita JID sem sufixo', () => {
    expect(jidToPhone('5511999998888')).toBe('5511999998888');
  });
  it('retorna null para entrada vazia', () => {
    expect(jidToPhone(null)).toBeNull();
    expect(jidToPhone(undefined)).toBeNull();
    expect(jidToPhone('')).toBeNull();
  });
  it('descarta caracteres não numéricos', () => {
    expect(jidToPhone('+55 (11) 99999-8888@s.whatsapp.net')).toBe('5511999998888');
  });
});

describe('openContactInChat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fromMock.mockClear();
    selectMock.mockClear();
    eqMock.mockClear();
    maybeSingleMock.mockReset();
    delete (window as unknown as { __pendingOpenContactId?: string }).__pendingOpenContactId;
    delete (window as unknown as { __pendingOpenChatTarget?: unknown }).__pendingOpenChatTarget;
    window.location.hash = '';
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolve direto via contactId sem consultar Supabase', async () => {
    const ok = await openContactInChat({ contactId: 'uuid-123', messageId: 'msg-1' });

    expect(ok).toBe(true);
    expect(fromMock).not.toHaveBeenCalled();
    expect((window as unknown as { __pendingOpenContactId?: string }).__pendingOpenContactId).toBe('uuid-123');
    const target = (window as unknown as { __pendingOpenChatTarget?: { messageId?: string } }).__pendingOpenChatTarget;
    expect(target?.messageId).toBe('msg-1');
    expect(window.location.hash).toBe('#inbox');
  });

  it('resolve por remoteJid via lookup em contacts', async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: { id: 'uuid-from-lookup' }, error: null });

    const ok = await openContactInChat({
      remoteJid: '5511777776666@s.whatsapp.net',
      messageId: 'm-99',
    });

    expect(ok).toBe(true);
    expect(fromMock).toHaveBeenCalledWith('contacts');
    expect(eqMock).toHaveBeenCalledWith('phone', '5511777776666');
    expect((window as unknown as { __pendingOpenContactId?: string }).__pendingOpenContactId).toBe('uuid-from-lookup');
  });

  it('resolve por phone explícito sem reparse', async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: { id: 'uuid-phone' }, error: null });
    const ok = await openContactInChat({ phone: '5511555554444' });
    expect(ok).toBe(true);
    expect(eqMock).toHaveBeenCalledWith('phone', '5511555554444');
  });

  it('retorna false e não muta janela quando contato não existe', async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });
    const ok = await openContactInChat({ remoteJid: '0000@s.whatsapp.net' });
    expect(ok).toBe(false);
    expect((window as unknown as { __pendingOpenContactId?: string }).__pendingOpenContactId).toBeUndefined();
  });

  it('despacha evento open-contact-chat com messageId no detail', async () => {
    const captured: Array<{ contactId?: string; messageId?: string }> = [];
    const handler = (e: Event) =>
      captured.push((e as CustomEvent).detail as { contactId?: string; messageId?: string });
    window.addEventListener('open-contact-chat', handler);

    await openContactInChat({ contactId: 'uuid-evt', messageId: 'msg-evt' });
    // Primeiro dispatch ocorre depois de 150ms.
    vi.advanceTimersByTime(200);

    window.removeEventListener('open-contact-chat', handler);
    expect(captured.length).toBeGreaterThan(0);
    expect(captured[0]).toEqual({ contactId: 'uuid-evt', messageId: 'msg-evt' });
  });

  it('redispara evento periodicamente para cobrir Inbox lazy', async () => {
    const calls: number[] = [];
    const handler = () => calls.push(Date.now());
    window.addEventListener('open-contact-chat', handler);

    await openContactInChat({ contactId: 'uuid-lazy' });
    // 150ms inicial + 5 retries de 200ms = 6 chamadas até 1.15s.
    vi.advanceTimersByTime(1200);

    window.removeEventListener('open-contact-chat', handler);
    expect(calls.length).toBeGreaterThanOrEqual(5);
  });
});
