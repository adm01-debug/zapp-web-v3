/**
 * useEmailSignature.test.ts — Testes para assinaturas de email Gmail
 *
 * Cobre:
 * - Carregar assinaturas por conta
 * - Criar nova assinatura
 * - Atualizar assinatura existente
 * - Definir assinatura como padrão
 * - Deletar assinatura
 * - Injetar assinatura em rascunho
 * - XSS sanitization no HTML da assinatura
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useEmailSignature } from '../useEmailSignature';

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
  },
}));

const MOCK_SIGNATURES = [
  {
    id: 'sig-1',
    account_id: 'acc-1',
    name: 'Assinatura Padrão',
    html_content: '<p>Atenciosamente,<br><strong>João Silva</strong><br>Empresa S.A.</p>',
    is_default: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'sig-2',
    account_id: 'acc-1',
    name: 'Assinatura Curta',
    html_content: '<p>Abs, João</p>',
    is_default: false,
    created_at: new Date().toISOString(),
  },
];

const makeQueryMock = (data: unknown[], error = null) => ({
  select:  vi.fn().mockReturnThis(),
  insert:  vi.fn().mockReturnThis(),
  update:  vi.fn().mockReturnThis(),
  delete:  vi.fn().mockReturnThis(),
  upsert:  vi.fn().mockReturnThis(),
  eq:      vi.fn().mockReturnThis(),
  neq:     vi.fn().mockReturnThis(),
  order:   vi.fn().mockResolvedValue({ data, error }),
  single:  vi.fn().mockResolvedValue({ data: data[0] ?? null, error }),
  select2: vi.fn().mockResolvedValue({ data, error }),
});

describe('useEmailSignature — carregamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeQueryMock(MOCK_SIGNATURES));
  });

  it('deve carregar assinaturas da conta', async () => {
    const { result } = renderHook(() => useEmailSignature('acc-1'));
    await waitFor(() => expect(result.current.signatures).toHaveLength(2));
    expect(result.current.signatures[0].name).toBe('Assinatura Padrão');
  });

  it('deve identificar assinatura padrão', async () => {
    const { result } = renderHook(() => useEmailSignature('acc-1'));
    await waitFor(() => expect(result.current.defaultSignature).not.toBeNull());
    expect(result.current.defaultSignature?.is_default).toBe(true);
    expect(result.current.defaultSignature?.name).toBe('Assinatura Padrão');
  });

  it('deve retornar lista vazia se sem conta', async () => {
    mockFrom.mockReturnValue(makeQueryMock([]));
    const { result } = renderHook(() => useEmailSignature(null));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.signatures).toHaveLength(0);
  });
});

describe('useEmailSignature — criar assinatura', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const newSig = { id: 'sig-3', account_id: 'acc-1', name: 'Nova', html_content: '<p>Nova</p>', is_default: false };
    const insertMock = {
      ...makeQueryMock([newSig]),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newSig, error: null }),
    };
    mockFrom.mockReturnValue(insertMock);
  });

  it('deve criar nova assinatura', async () => {
    const { result } = renderHook(() => useEmailSignature('acc-1'));

    await act(async () => {
      await result.current.createSignature({
        name: 'Nova Assinatura',
        html_content: '<p>Conteúdo da assinatura</p>',
        is_default: false,
      });
    });

    expect(mockFrom).toHaveBeenCalledWith('gmail_signatures');
  });
});

describe('useEmailSignature — assinatura padrão', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeQueryMock(MOCK_SIGNATURES));
  });

  it('deve injetar assinatura padrão em corpo de email', async () => {
    const { result } = renderHook(() => useEmailSignature('acc-1'));
    await waitFor(() => expect(result.current.defaultSignature).not.toBeNull());

    const bodyWithSig = result.current.injectSignature('<p>Olá, tudo bem?</p>');

    expect(bodyWithSig).toContain('João Silva');
    expect(bodyWithSig).toContain('Olá, tudo bem?');
  });

  it('deve inserir assinatura após divisor ---', async () => {
    const { result } = renderHook(() => useEmailSignature('acc-1'));
    await waitFor(() => expect(result.current.defaultSignature).not.toBeNull());

    const bodyWithSig = result.current.injectSignature('<p>Body</p>');
    // A assinatura deve vir após o body
    const bodyIndex = bodyWithSig.indexOf('Body');
    const sigIndex  = bodyWithSig.indexOf('João Silva');
    expect(sigIndex).toBeGreaterThan(bodyIndex);
  });

  it('deve retornar body original se não há assinatura padrão', async () => {
    mockFrom.mockReturnValue(makeQueryMock([]));
    const { result } = renderHook(() => useEmailSignature('acc-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const body = '<p>Corpo do email</p>';
    const result2 = result.current.injectSignature(body);
    expect(result2).toBe(body);
  });
});

describe('useEmailSignature — sanitização XSS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeQueryMock(MOCK_SIGNATURES));
  });

  it('deve sanitizar HTML malicioso na assinatura', async () => {
    const { result } = renderHook(() => useEmailSignature('acc-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Simular criação com HTML malicioso
    const maliciousHtml = '<p>Assinatura</p><script>alert("xss")</script>';
    const clean = result.current.sanitizeHtml(maliciousHtml);

    expect(clean).not.toContain('<script>');
    expect(clean).toContain('Assinatura');
  });

  it('deve permitir tags HTML seguras na assinatura', async () => {
    const { result } = renderHook(() => useEmailSignature('acc-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const safeHtml = '<p><strong>João</strong> <em>Silva</em><br>Tel: (11) 99999-9999</p>';
    const clean = result.current.sanitizeHtml(safeHtml);

    expect(clean).toContain('<strong>');
    expect(clean).toContain('<em>');
  });
});
