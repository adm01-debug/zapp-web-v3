import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatPanelHandlers } from '@/features/inbox/chat/useChatPanelHandlers';

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  log: {
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/lib/undoToast', () => ({
  undoToast: vi.fn(),
}));

describe('useChatPanelHandlers (covering useChatPanelDialogs)', () => {
  const mockOpts = {
    conversationId: 'conv-1',
    contactId: 'contact-1',
    contactPhone: '5511999999999',
    onSendMessage: vi.fn(),
    editMessageApi: vi.fn(),
    applySignature: (t: string) => t,
    handleTypingStart: vi.fn(),
    handleTypingStop: vi.fn(),
    openDialog: vi.fn(),
    closeDialog: vi.fn(),
    handleSetActiveTool: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('manages input value state', () => {
    const { result } = renderHook(() => useChatPanelHandlers(mockOpts));

    act(() => {
      result.current.setInputValue('Hello world');
    });

    expect(result.current.inputValue).toBe('Hello world');
  });

  it('handles dialog triggers via input change (slash commands)', () => {
    const { result } = renderHook(() => useChatPanelHandlers(mockOpts));

    act(() => {
      const e = { target: { value: '/' } } as any;
      result.current.handleInputChange(e);
    });

    expect(mockOpts.openDialog).toHaveBeenCalledWith('slashCommands');
    expect(mockOpts.closeDialog).toHaveBeenCalledWith('quickReplies');
  });

  it('handles sending a message', async () => {
    const { result } = renderHook(() => useChatPanelHandlers(mockOpts));

    act(() => {
      result.current.setInputValue('Test message');
    });

    await act(async () => {
      await result.current.handleSend();
    });

    expect(mockOpts.onSendMessage).toHaveBeenCalledWith('Test message');
    expect(result.current.inputValue).toBe('');
  });

  it('sets up reply to message', () => {
    const { result } = renderHook(() => useChatPanelHandlers(mockOpts));
    const mockMsg = { id: 'msg-1', content: 'Original' } as any;

    act(() => {
      result.current.handleReplyToMessage(mockMsg);
    });

    expect(result.current.replyToMessage).toEqual(mockMsg);
  });

  it('toggles editing mode', () => {
    const { result } = renderHook(() => useChatPanelHandlers(mockOpts));
    const mockMsg = { id: 'msg-1', content: 'To edit', timestamp: new Date() } as any;

    act(() => {
      result.current.handleEditStart(mockMsg);
    });

    expect(result.current.editingMessage).toEqual(mockMsg);
    expect(result.current.inputValue).toBe('To edit');

    act(() => {
      result.current.handleCancelEdit();
    });

    expect(result.current.editingMessage).toBeNull();
    expect(result.current.inputValue).toBe('');
  });
});
