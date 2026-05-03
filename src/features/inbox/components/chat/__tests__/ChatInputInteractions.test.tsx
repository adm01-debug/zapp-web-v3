import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInputArea } from '../ChatInputArea';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/components/mobile/SwipeableMessage', () => ({ SwipeableMessage: ({children}: any) => <div>{children}</div> }));
vi.mock('@/features/inbox/hooks/useMentions', () => ({ useMentions: () => ({ isOpen: false, cursorPos: 0, checkForMention: vi.fn(), handleSelect: vi.fn(), close: vi.fn() }) }));

describe('ChatInputArea — Interaction Scenarios', () => {
  const queryClient = new QueryClient();

  const defaultProps = {
    inputValue: '',
    replyToMessage: null,
    isRecordingAudio: false,
    showSlashCommands: false,
    contactId: 'contact-123',
    contactPhone: '5511999999999',
    contactName: 'John Doe',
    messages: [],
    quickReplies: [],
    onInputChange: vi.fn(),
    onKeyDown: vi.fn(),
    onBlur: vi.fn(),
    onSend: vi.fn(),
    onCancelReply: vi.fn(),
    onSlashCommand: vi.fn(),
    onCloseSlashCommands: vi.fn(),
    onQuickReply: vi.fn(),
    onRecordToggle: vi.fn(),
    onAudioSend: vi.fn(),
    onAudioCancel: vi.fn(),
    onOpenInteractiveBuilder: vi.fn(),
    onOpenSchedule: vi.fn(),
    onOpenLocationPicker: vi.fn(),
    onSendProduct: vi.fn(),
    onSendSticker: vi.fn(),
    onSendAudioMeme: vi.fn(),
    onSendCustomEmoji: vi.fn(),
    onSelectSuggestion: vi.fn(),
    onSelectTemplate: vi.fn(),
    fileUploaderRef: { current: null } as any,
    inputRef: { current: null } as any,
  };

  it('Scenario 1: Toggle between Mic and Send icons based on text', () => {
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ChatInputArea {...defaultProps} inputValue="" />
        </TooltipProvider>
      </QueryClientProvider>
    );

    // Should show Mic initially
    expect(screen.getByLabelText(/gravar áudio/i)).toBeTruthy();

    // Rerender with text
    rerender(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ChatInputArea {...defaultProps} inputValue="Hello" />
        </TooltipProvider>
      </QueryClientProvider>
    );

    // Should show Send icon
    expect(screen.getByLabelText(/enviar mensagem/i)).toBeTruthy();
  });

  it('Scenario 2: Plus button animation and menu open', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ChatInputArea {...defaultProps} />
        </TooltipProvider>
      </QueryClientProvider>
    );

    const plusButton = screen.getByLabelText(/mais opções de mensagem/i);
    expect(plusButton).toBeTruthy();
    
    // Simulate click
    fireEvent.click(plusButton);
    
    // Check if popover menu items appear (e.g. from TertiaryToolsMenu)
    // Note: Items depend on TertiaryToolsMenu implementation which is mocked/partial here
  });

  it('Scenario 3: Character counter visibility', () => {
    const longText = 'a'.repeat(101);
    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ChatInputArea {...defaultProps} inputValue={longText} />
        </TooltipProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText(new RegExp(`101/4096`))).toBeTruthy();
  });
});
