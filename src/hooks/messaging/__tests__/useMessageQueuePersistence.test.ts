/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMessageQueue } from '../useMessageQueue';

// Mock Evolution API
const mockSendTextMessage = vi.fn().mockResolvedValue({ status: 'success' });
vi.mock('@/hooks/useEvolutionApi', () => ({
  useEvolutionApi: () => ({
    sendTextMessage: mockSendTextMessage
  })
}));

// Mock Toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}));

describe('useMessageQueue - Persistence', () => {
  const instanceName = 'test_instance';
  const localStorageKey = `pending_msgs_${instanceName}`;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('deve persistir mensagens no localStorage ao enfileirar', () => {
    const { result } = renderHook(() => useMessageQueue(instanceName));

    act(() => {
      result.current.enqueueMessage('5511999999999@s.whatsapp.net', 'Olá mundo');
    });

    const saved = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
    expect(saved).toHaveLength(1);
    expect(saved[0].content).toBe('Olá mundo');
    expect(saved[0].status).toBe('pending');
  });

  it('deve recuperar mensagens do localStorage ao inicializar', () => {
    const initialMsgs = [{
      id: 'pending_123',
      remote_jid: '5511999999999@s.whatsapp.net',
      content: 'Mensagem persistida',
      status: 'pending',
      timestamp: Date.now(),
      retries: 0
    }];
    
    localStorage.setItem(localStorageKey, JSON.stringify(initialMsgs));

    const { result } = renderHook(() => useMessageQueue(instanceName));

    expect(result.current.pendingMessages).toHaveLength(1);
    expect(result.current.pendingMessages[0].content).toBe('Mensagem persistida');
  });

  it('deve remover mensagem do localStorage após envio com sucesso', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useMessageQueue(instanceName));

    await act(async () => {
      result.current.enqueueMessage('5511999999999@s.whatsapp.net', 'Sucesso');
    });

    // Wait for internal timeouts in processQueue
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    const saved = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
    expect(saved).toHaveLength(0);
    vi.useRealTimers();
  });
});
