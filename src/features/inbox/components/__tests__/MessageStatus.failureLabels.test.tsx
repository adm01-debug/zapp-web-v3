/**
 * Component tests for `MessageStatus` badge rendering of terminal failure
 * states (`failed_auth` / `failed_retries`) when `errorReason` is missing.
 *
 * Pins two related contracts:
 *
 *   1. `errorReason: undefined` and `errorReason: ''` MUST render the SAME
 *      base label — no trailing "— " separator and no empty appendix.
 *      Both are "no reason available" from the user's perspective.
 *
 *   2. A non-empty `errorReason` is appended as `"<base> — <reason>"`.
 *
 * The badge text is shown both in the inline label (when `showLabel`) and
 * inside the tooltip content; we assert against the tooltip content because
 * it is always rendered in the DOM (Radix portals it into the tree at mount).
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageStatus } from '../..';

const FAILED_AUTH_BASE = 'Falha de autenticação';
const FAILED_RETRIES_BASE = 'Falhou após várias tentativas';

function getLabelTexts(): string[] {
  // `showLabel` mounts an inline <span> AND the tooltip content also carries
  // the label text. Collect every node whose text starts with one of the
  // known failure label prefixes (base or "Falhou após N tentativas").
  return screen.getAllByText((_, node) => {
    if (!node) return false;
    const text = node.textContent ?? '';
    return (
      text.startsWith(FAILED_AUTH_BASE) ||
      text.startsWith(FAILED_RETRIES_BASE) ||
      /^Falhou após \d+ tentativas$/.test(text)
    );
  }).map(n => n.textContent ?? '');
}

describe('MessageStatus — failed_auth label with missing errorReason', () => {
  it('renders only the base label when errorReason is undefined', () => {
    render(<MessageStatus status="failed_auth" showLabel detail={{ errorReason: undefined }} />);
    const texts = getLabelTexts();
    expect(texts.length).toBeGreaterThan(0);
    for (const t of texts) {
      expect(t).toBe(FAILED_AUTH_BASE);
      expect(t).not.toContain('—');
    }
  });

  it('renders only the base label when errorReason is an empty string', () => {
    render(<MessageStatus status="failed_auth" showLabel detail={{ errorReason: '' }} />);
    const texts = getLabelTexts();
    expect(texts.length).toBeGreaterThan(0);
    for (const t of texts) {
      // Empty string is falsy → label-builder skips the "— <reason>" branch,
      // matching the `undefined` behavior. This is the contract we want.
      expect(t).toBe(FAILED_AUTH_BASE);
      expect(t).not.toMatch(/—\s*$/);
    }
  });

  it('appends a non-empty errorReason after an em dash separator', () => {
    render(
      <MessageStatus
        status="failed_auth"
        showLabel
        detail={{ errorReason: 'token expired' }}
      />,
    );
    const texts = getLabelTexts();
    expect(texts.some(t => t === `${FAILED_AUTH_BASE} — token expired`)).toBe(true);
  });
});

describe('MessageStatus — failed_retries label with missing errorReason', () => {
  it('renders only the base label when errorReason is undefined', () => {
    render(<MessageStatus status="failed_retries" showLabel detail={{ errorReason: undefined }} />);
    const texts = getLabelTexts();
    expect(texts.length).toBeGreaterThan(0);
    for (const t of texts) {
      expect(t).toBe(FAILED_RETRIES_BASE);
      expect(t).not.toContain('—');
    }
  });

  it('renders only the base label when errorReason is an empty string', () => {
    render(<MessageStatus status="failed_retries" showLabel detail={{ errorReason: '' }} />);
    const texts = getLabelTexts();
    expect(texts.length).toBeGreaterThan(0);
    for (const t of texts) {
      expect(t).toBe(FAILED_RETRIES_BASE);
      expect(t).not.toMatch(/—\s*$/);
    }
  });

  it('produces identical output for undefined vs empty string', () => {
    const { unmount } = render(
      <MessageStatus status="failed_retries" showLabel detail={{ errorReason: undefined }} />,
    );
    const undefinedTexts = getLabelTexts().slice().sort();
    unmount();

    render(<MessageStatus status="failed_retries" showLabel detail={{ errorReason: '' }} />);
    const emptyTexts = getLabelTexts().slice().sort();

    // Same number of label nodes and same content — so the UI cannot
    // visually distinguish "missing" from "empty string" for this status.
    expect(emptyTexts).toEqual(undefinedTexts);
  });

  it('prefers totalRetries-based label over errorReason when both can apply', () => {
    // When totalRetries is present the builder short-circuits BEFORE the
    // errorReason branch — verifies precedence so we don't regress.
    render(
      <MessageStatus
        status="failed_retries"
        showLabel
        detail={{ totalRetries: 3, errorReason: 'network error' }}
      />,
    );
    const texts = getLabelTexts();
    expect(texts.some(t => t === 'Falhou após 3 tentativas')).toBe(true);
    expect(texts.every(t => !t.includes('network error'))).toBe(true);
  });
});

describe('MessageStatus — whitespace-only errorReason is treated as missing', () => {
  // The label builder normalizes `errorReason` via a safe-display coercer
  // (`safeDisplay`) that trims strings and drops empty/whitespace-only
  // values. A whitespace-only reason MUST render the base label only —
  // no trailing " — " separator and no empty appendix. This is the same
  // contract enforced for `''` and `undefined`.
  it('renders only the base label for a whitespace-only errorReason', () => {
    const { container } = render(
      <MessageStatus status="failed_auth" showLabel detail={{ errorReason: '   ' }} />,
    );
    const inlineLabel = container.querySelector('span.text-xs');
    expect(inlineLabel).not.toBeNull();
    const text = (inlineLabel?.textContent ?? '').trim();
    expect(text).toBe(FAILED_AUTH_BASE);
    expect(text).not.toContain('—');
  });
});
