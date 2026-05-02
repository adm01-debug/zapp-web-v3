/**
 * ContactsAccessibilityEnhancements.tsx
 * WCAG 2.1 AA accessibility improvements for the contacts module.
 *
 * Provides:
 * - Keyboard navigation hooks
 * - Screen reader announcements
 * - Focus management utilities
 * - ARIA live region manager
 */
import { useEffect, useRef, useCallback } from 'react';

// ── Screen Reader Announcer ────────────────────────────────────────────────

/**
 * Hook to announce messages to screen readers via aria-live region.
 * Use for dynamic content changes (search results, save confirmation, errors).
 */
export function useScreenReaderAnnouncer() {
  const politeRef   = useRef<HTMLDivElement | null>(null);
  const assertiveRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create invisible live regions if they don't exist
    const createRegion = (id: string, ariaLive: 'polite' | 'assertive') => {
      let el = document.getElementById(id) as HTMLDivElement | null;
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        el.setAttribute('aria-live', ariaLive);
        el.setAttribute('aria-atomic', 'true');
        el.setAttribute('aria-relevant', 'additions text');
        Object.assign(el.style, {
          position: 'absolute', width: '1px', height: '1px',
          padding: '0', overflow: 'hidden', clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap', border: '0',
        });
        document.body.appendChild(el);
      }
      return el;
    };

    politeRef.current    = createRegion('contacts-sr-polite', 'polite');
    assertiveRef.current = createRegion('contacts-sr-assertive', 'assertive');

    return () => {
      // Don't remove on unmount — keep regions for other components
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const el = priority === 'assertive' ? assertiveRef.current : politeRef.current;
    if (!el) return;

    // Clear and re-set to force announcement even for same message
    el.textContent = '';
    requestAnimationFrame(() => {
      if (el) el.textContent = message;
    });
  }, []);

  return { announce };
}

// ── Focus Management ───────────────────────────────────────────────────────

/**
 * Hook to trap focus inside a container (modals, dialogs).
 * Returns ref to attach to the container element.
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'select:not([disabled])', 'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    // Focus first element on mount
    const firstFocusable = getFocusable()[0];
    firstFocusable?.focus();

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}

/**
 * Hook to restore focus to a trigger element when a dialog closes.
 */
export function useFocusRestore(isOpen: boolean) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);
}

// ── Keyboard Navigation ────────────────────────────────────────────────────

/**
 * Hook for arrow-key navigation in a contacts list.
 * Attach to the list container; handles Up/Down/Home/End.
 */
export function useContactListKeyboardNav(
  itemCount: number,
  onSelect?: (index: number) => void
) {
  const activeIndexRef = useRef(-1);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const max = itemCount - 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        activeIndexRef.current = Math.min(activeIndexRef.current + 1, max);
        break;
      case 'ArrowUp':
        e.preventDefault();
        activeIndexRef.current = Math.max(activeIndexRef.current - 1, 0);
        break;
      case 'Home':
        e.preventDefault();
        activeIndexRef.current = 0;
        break;
      case 'End':
        e.preventDefault();
        activeIndexRef.current = max;
        break;
      case 'Enter':
      case ' ':
        if (activeIndexRef.current >= 0) {
          e.preventDefault();
          onSelect?.(activeIndexRef.current);
        }
        break;
      default:
        return;
    }

    // Focus the active row
    const rows = (e.currentTarget as HTMLElement).querySelectorAll('[role="row"]');
    (rows[activeIndexRef.current] as HTMLElement)?.focus();
  }, [itemCount, onSelect]);

  return { handleKeyDown, activeIndex: activeIndexRef.current };
}

// ── ARIA Label Helpers ─────────────────────────────────────────────────────

export function getContactAriaLabel(contact: {
  name: string;
  phone?: string | null;
  email?: string | null;
  channel?: string | null;
}): string {
  const parts = [contact.name];
  if (contact.phone) parts.push(`telefone ${contact.phone}`);
  if (contact.email) parts.push(`email ${contact.email}`);
  if (contact.channel) parts.push(`via ${contact.channel}`);
  return parts.join(', ');
}

export function getDeleteAriaLabel(contactName: string): string {
  return `Excluir contato ${contactName}`;
}

export function getMergeAriaLabel(name1: string, name2: string): string {
  return `Mesclar contatos ${name1} e ${name2}`;
}

export function getRestoreAriaLabel(contactName: string): string {
  return `Restaurar contato ${contactName} da lixeira`;
}
