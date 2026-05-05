import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInputArea } from '../ChatInputArea';
import React from 'react';

// Mock components to avoid deep testing of logic
vi.mock('../useChatInputLogic', () => ({
  useChatInputLogic: vi.fn(() => ({
    attachments: [],
    hasText: false,
    isMobile: false,
    isOverLimit: false,
    charCount: 0,
    CHAR_LIMIT: 4096,
    sendAnimation: false,
    showRichToolbar: false,
    showMarkdownPreview: false,
    handleSendWithAnimation: vi.fn(),
    handleFileSelect: vi.fn(),
    handlePaste: vi.fn(),
    handleVoiceDictation: vi.fn(),
    removeAttachment: vi.fn(),
  })),
  setNativeValue: vi.fn(),
}));

vi.mock('../MentionAutocomplete', () => ({
  MentionAutocomplete: () => null,
  useMentions: () => ({ isOpen: false, checkForMention: vi.fn(), handleSelect: vi.fn(), close: vi.fn() }),
}));

describe('ChatInputArea Transitions', () => {
  const defaultProps = {
    inputValue: '',
    replyToMessage: null,
    isRecordingAudio: false,
    showSlashCommands: false,
    contactId: '1',
    contactPhone: '123',
    contactName: 'Test',
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

  it('renders correctly', () => {
    render(<ChatInputArea {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Escreva sua mensagem/i)).toBeDefined();
  });
});
