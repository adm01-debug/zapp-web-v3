import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatSearch, SearchFilter } from '../useChatSearch';
import { Message } from '@/types/chat';

const mockMessages: Message[] = [
  { id: '1', content: 'Olá, como vai?', type: 'text', timestamp: new Date('2024-01-01T10:00:00Z'), status: 'delivered', sender: 'contact' },
  { id: '2', content: 'Tudo bem, e você?', type: 'text', timestamp: new Date('2024-01-01T10:01:00Z'), status: 'delivered', sender: 'agent' },
  { id: '3', content: 'Olha essa imagem', type: 'image', mediaUrl: 'http://example.com/img.jpg', timestamp: new Date('2024-01-01T10:02:00Z'), status: 'delivered', sender: 'contact' },
  { id: '4', content: 'E esse áudio', type: 'audio', mediaUrl: 'http://example.com/audio.mp3', timestamp: new Date('2024-01-01T10:03:00Z'), status: 'delivered', sender: 'agent' },
  { id: '5', content: 'Link importante: https://google.com', type: 'text', timestamp: new Date('2024-01-01T10:04:00Z'), status: 'delivered', sender: 'contact' },
  { id: '6', content: 'Figurinha legal', type: 'sticker' as any, mediaUrl: 'http://example.com/sticker.webp', timestamp: new Date('2024-01-01T10:05:00Z'), status: 'delivered', sender: 'agent' },
];

describe('useChatSearch Logic', () => {
  const setup = () => {
    const onHighlightChange = vi.fn();
    const onNavigateToMessage = vi.fn();
    const onSearchQueryChange = vi.fn();

    const { result } = renderHook(() => useChatSearch({
      messages: mockMessages,
      isOpen: true,
      onHighlightChange,
      onNavigateToMessage,
      onSearchQueryChange,
    }));

    return { result, onHighlightChange, onNavigateToMessage, onSearchQueryChange };
  };

  it('should filter by text query', async () => {
    const { result } = setup();

    act(() => {
      result.current.setQuery('Olá');
    });

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 300));

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe('1');
  });

  it('should filter by media type: image', async () => {
    const { result } = setup();

    act(() => {
      result.current.setFilter('image');
    });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe('3');
  });

  it('should filter by media type: audio', async () => {
    const { result } = setup();

    act(() => {
      result.current.setFilter('audio');
    });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe('4');
  });

  it('should filter by link', async () => {
    const { result } = setup();

    act(() => {
      result.current.setFilter('link');
    });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe('5');
  });

  it('should navigate results (next/previous)', async () => {
    const { result, onNavigateToMessage } = setup();

    act(() => {
      result.current.setQuery('e'); // Matches messages 1, 2, 3, 4, 6
    });

    await new Promise(resolve => setTimeout(resolve, 300));

    expect(result.current.results.length).toBeGreaterThan(1);
    const firstResultId = result.current.results[0].id;

    act(() => {
      result.current.navigateDown();
    });

    expect(result.current.activeIndex).toBe(1);
    expect(onNavigateToMessage).toHaveBeenCalledWith(result.current.results[1].id);

    act(() => {
      result.current.navigateUp();
    });

    expect(result.current.activeIndex).toBe(0);
    expect(onNavigateToMessage).toHaveBeenCalledWith(firstResultId);
  });

  it('should handle empty results', async () => {
    const { result } = setup();

    act(() => {
      result.current.setQuery('nonexistent');
    });

    await new Promise(resolve => setTimeout(resolve, 300));

    expect(result.current.results).toHaveLength(0);
  });

  it('should handle accent-insensitive search', async () => {
    const { result } = setup();

    act(() => {
      result.current.setQuery('ola'); // Query without accent
    });

    await new Promise(resolve => setTimeout(resolve, 300));

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].content).toContain('Olá');
  });
});
