/**
 * Accessibility utilities for ZAPP WEB.
 *
 * Provides keyboard navigation helpers, screen reader announcements,
 * and focus management for the omnichannel interface.
 */

/**
 * Announces a message to screen readers via an ARIA live region.
 * Creates the live region on first call, reuses it afterward.
 */
let liveRegion: HTMLElement | null = null;

export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite',
): void {
  if (typeof document === 'undefined') return;

  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only'; // Visually hidden
    liveRegion.style.cssText =
      'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;';
    document.body.appendChild(liveRegion);
  }

  liveRegion.setAttribute('aria-live', priority);
  // Clear and re-set to trigger re-announcement
  liveRegion.textContent = '';
  requestAnimationFrame(() => {
    if (liveRegion) liveRegion.textContent = message;
  });
}

/**
 * Traps keyboard focus within a container element.
 * Useful for modals, dialogs, and side panels.
 * Returns a cleanup function to remove the trap.
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableSelector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const handler = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(focusableSelector),
    ).filter((el) => el.offsetParent !== null); // Visible only

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  container.addEventListener('keydown', handler);
  return () => container.removeEventListener('keydown', handler);
}

/**
 * Keyboard shortcut registry for the application.
 * Prevents conflicts and provides a centralized place to manage shortcuts.
 */
interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  handler: (e: KeyboardEvent) => void;
  /** Scope where this shortcut is active (default: 'global') */
  scope?: string;
}

const shortcuts: Map<string, Shortcut> = new Map();

function shortcutId(s: Pick<Shortcut, 'key' | 'ctrl' | 'shift' | 'alt'>): string {
  const parts: string[] = [];
  if (s.ctrl) parts.push('ctrl');
  if (s.shift) parts.push('shift');
  if (s.alt) parts.push('alt');
  parts.push(s.key.toLowerCase());
  return parts.join('+');
}

export function registerShortcut(shortcut: Shortcut): () => void {
  const id = shortcutId(shortcut);
  shortcuts.set(id, shortcut);

  return () => {
    shortcuts.delete(id);
  };
}

export function initKeyboardShortcuts(): () => void {
  const handler = (e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Only allow global shortcuts (Ctrl/Cmd combos)
      if (!e.ctrlKey && !e.metaKey) return;
    }

    const id = shortcutId({
      key: e.key,
      ctrl: e.ctrlKey || e.metaKey,
      shift: e.shiftKey,
      alt: e.altKey,
    });

    const shortcut = shortcuts.get(id);
    if (shortcut) {
      e.preventDefault();
      shortcut.handler(e);
    }
  };

  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}

/**
 * Returns all registered shortcuts for display in a help dialog.
 */
export function getRegisteredShortcuts(): Array<{
  keys: string;
  description: string;
  scope: string;
}> {
  return Array.from(shortcuts.values()).map((s) => ({
    keys: shortcutId(s).replace(/\+/g, ' + ').toUpperCase(),
    description: s.description,
    scope: s.scope || 'global',
  }));
}

/**
 * Generates a unique ID for ARIA relationships.
 * Ensures each element has a unique ID for aria-labelledby, aria-describedby, etc.
 */
let ariaIdCounter = 0;
export function generateAriaId(prefix = 'aria'): string {
  ariaIdCounter++;
  return `${prefix}-${ariaIdCounter}`;
}
