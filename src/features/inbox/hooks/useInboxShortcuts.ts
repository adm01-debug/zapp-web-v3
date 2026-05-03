import { useEffect, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

interface UseInboxShortcutsProps {
  onSearchFocus: () => void;
  onNextConversation: () => void;
  onPrevConversation: () => void;
  onArchive: () => void;
  onTransfer: () => void;
  onRefresh: () => void;
  enabled?: boolean;
}

export function useInboxShortcuts({
  onSearchFocus,
  onNextConversation,
  onPrevConversation,
  onArchive,
  onTransfer,
  onRefresh,
  enabled = true,
}: UseInboxShortcutsProps) {
  // Focus search: Cmd+K or Ctrl+K
  useHotkeys(['mod+k', '/'], (e) => {
    e.preventDefault();
    onSearchFocus();
  }, { enabled });

  // Navigation: Alt + Up/Down
  useHotkeys('alt+up', (e) => {
    e.preventDefault();
    onPrevConversation();
  }, { enabled });

  useHotkeys('alt+down', (e) => {
    e.preventDefault();
    onNextConversation();
  }, { enabled });

  // Actions
  useHotkeys('mod+e', (e) => {
    e.preventDefault();
    onArchive();
  }, { enabled });

  useHotkeys('mod+shift+t', (e) => {
    e.preventDefault();
    onTransfer();
  }, { enabled });

  useHotkeys('mod+r', (e) => {
    e.preventDefault();
    onRefresh();
  }, { enabled });
}
