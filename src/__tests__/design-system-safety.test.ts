import { describe, it, expect } from 'vitest';
import { getSuggestion } from '../../scripts/check-design-system';
import { DS_CONFIG } from '../../scripts/ds-config';

describe('Design System Auditor Safety', () => {
  const whitelistedColors = DS_CONFIG.WHITELIST.colors;

  it('should only suggest whitelisted semantic tokens for colors', () => {
    // Literal colors
    const redSuggestion = getSuggestion('Literal Color', 'bg-red-500');
    expect(redSuggestion.replacement).toBe('bg-destructive');
    expect(whitelistedColors).toContain('destructive');

    const amberSuggestion = getSuggestion('Literal Color', 'text-amber-500');
    expect(amberSuggestion.replacement).toBe('text-warning');
    expect(whitelistedColors).toContain('warning');

    const graySuggestion = getSuggestion('Literal Color', 'border-gray-200');
    expect(graySuggestion.replacement).toBe('border-muted');
    expect(whitelistedColors).toContain('muted');
  });

  it('should not invent new tokens without approval', () => {
    const unknownSuggestion = getSuggestion('Literal Color', 'bg-unknown-999');
    // If it doesn't know the mapping, it shouldn't suggest a replacement
    expect(unknownSuggestion.replacement).toBeUndefined();
  });

  it('should correctly identify valid technical brand colors', () => {
    const googleBlue = getSuggestion('Raw Hex', '#4285F4');
    expect(googleBlue.suggestion).toContain('VALID: Google Blue');
    expect(googleBlue.replacement).toBeUndefined(); // Don't auto-replace valid technical cases

    const pdfOrange = getSuggestion('Raw Hex', '#f1592a');
    expect(pdfOrange.suggestion).toContain('VALID: PDF brand color');
  });

  it('should handle redundant correctly', () => {
    const fontSans = getSuggestion('Literal Font', 'font-sans');
    expect(fontSans.replacement).toBe(''); // Suggest removal
    expect(fontSans.priority).toBe('High');
  });

  it('should preserve for technical review', () => {
    const fontMono = getSuggestion('Literal Font', 'font-mono');
    expect(fontMono.replacement).toBeUndefined(); // Don't auto-remove
    expect(fontMono.priority).toBe('Medium');
    expect(fontMono.suggestion).toContain('technical data');
  });

  it('should safely handle variants', () => {
    const hoverRed = getSuggestion('Literal Color', 'hover:bg-red-600');
    expect(hoverRed.replacement).toBe('hover:bg-destructive');
    expect(hoverRed.prefix).toBe('hover:');
  });
});
