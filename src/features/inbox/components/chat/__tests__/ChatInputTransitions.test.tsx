import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatInputArea } from '../ChatInputArea';
import React from 'react';
import { useChatInputLogic } from '../useChatInputLogic';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock dependências complexas
vi.mock('../useChatInputLogic', () => ({
  useChatInputLogic: vi.fn(),
  setNativeValue: vi.fn(),
}));

vi.mock('../MentionAutocomplete', () => ({
  MentionAutocomplete: () => null,
  useMentions: () => ({ isOpen: false, checkForMention: vi.fn(), handleSelect: vi.fn(), close: vi.fn() }),
}));

vi.mock('../RichTextToolbar', () => ({
  RichTextToolbar: () => null,
  RichTextToggle: () => null,
}));

vi.mock('../InputPreviewBars', () => ({
  InputPreviewBars: () => null,
}));

vi.mock('../ChatInputToolbars', () => ({
  TertiaryToolsMenu: () => null,
  SecondaryToolbar: () => null,
}));

vi.mock('../../AudioRecorder', () => ({
  AudioRecorder: ({ onSend, onCancel }: any) => (
    <div data-testid="audio-recorder">
      <button onClick={() => onSend(new Blob())}>Confirmar</button>
      <button onClick={onCancel}>Cancelar</button>
    </div>
  ),
}));

describe('ChatInputArea Interaction Transitions', () => {
  const mockOnSend = vi.fn();
  const mockOnRecordToggle = vi.fn();
  const mockOnInputChange = vi.fn();

  const defaultProps: any = {
    inputValue: '',
    replyToMessage: null,
    isRecordingAudio: false,
    showSlashCommands: false,
    contactId: '1',
    contactPhone: '123',
    contactName: 'Test',
    messages: [],
    quickReplies: [],
    onInputChange: mockOnInputChange,
    onKeyDown: vi.fn(),
    onBlur: vi.fn(),
    onSend: mockOnSend,
    onCancelReply: vi.fn(),
    onSlashCommand: vi.fn(),
    onCloseSlashCommands: vi.fn(),
    onQuickReply: vi.fn(),
    onRecordToggle: mockOnRecordToggle,
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
    fileUploaderRef: { current: null },
    inputRef: { current: { value: '', focus: vi.fn(), style: {} } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProvider = (ui: React.ReactElement) => {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
  };

  it('deve desabilitar gravação quando há texto', () => {
    (useChatInputLogic as any).mockReturnValue({
      attachments: [],
      hasText: true,
      canSend: true,
      isMicActive: false,
      isMobile: false,
      isOverLimit: false,
      charCount: 10,
      CHAR_LIMIT: 4096,
      handleSendWithAnimation: vi.fn(),
    });

    renderWithProvider(<ChatInputArea {...defaultProps} inputValue="Olá" />);
    
    const micButton = screen.getByLabelText(/Gravar áudio/i);
    expect(micButton).toBeDisabled();
  });

  it('deve desabilitar envio quando não há texto ou anexos', () => {
    (useChatInputLogic as any).mockReturnValue({
      attachments: [],
      hasText: false,
      canSend: false,
      isMicActive: false,
      isMobile: false,
      isOverLimit: false,
      charCount: 0,
      handleSendWithAnimation: vi.fn(),
    });

    renderWithProvider(<ChatInputArea {...defaultProps} />);
    
    // Send button remains highlightable to trigger file picker if empty, but here it matches canSend
    const sendButton = screen.getByLabelText(/Enviar mensagem/i);
    expect(sendButton.getAttribute('aria-disabled')).toBe('true');
  });

  it('deve permitir envio quando há anexos mesmo sem texto', () => {
    (useChatInputLogic as any).mockReturnValue({
      attachments: [{ id: '1', file: new File([], 'test.jpg') }],
      hasText: false,
      canSend: true,
      isMicActive: false,
      isMobile: false,
      isOverLimit: false,
      charCount: 0,
      handleSendWithAnimation: vi.fn(),
    });

    renderWithProvider(<ChatInputArea {...defaultProps} />);
    
    const sendButton = screen.getByLabelText(/Enviar mensagem/i);
    expect(sendButton.getAttribute('aria-disabled')).toBe('false');
    
    const micButton = screen.getByLabelText(/Gravar áudio/i);
    expect(micButton).toBeDisabled();
  });

  it('deve exibir estado de carregando durante o envio', () => {
    (useChatInputLogic as any).mockReturnValue({
      attachments: [],
      hasText: true,
      canSend: true,
      isMicActive: false,
      isMobile: false,
      isOverLimit: false,
      charCount: 5,
      handleSendWithAnimation: vi.fn(),
    });

    renderWithProvider(<ChatInputArea {...defaultProps} isSending={true} />);
    
    expect(screen.getByLabelText(/Enviar mensagem/i)).toBeDisabled();
    expect(screen.getByText(/Enviando/i)).toBeDefined();
  });
});