import { describe, it, expect } from 'vitest';
import { toValidDate } from '../normalize';

describe('toValidDate', () => {
  it('should return a Date object for valid strings', () => {
    const input = '2024-05-01T12:00:00Z';
    const result = toValidDate(input);
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2024-05-01T12:00:00.000Z');
  });

  it('should return fallback for null/undefined', () => {
    const fallback = new Date('2024-01-01');
    expect(toValidDate(null, fallback)).toBe(fallback);
    expect(toValidDate(undefined, fallback)).toBe(fallback);
  });

  it('should return fallback for invalid date strings', () => {
    const input = 'not-a-date';
    const fallback = new Date('2024-01-01');
    const result = toValidDate(input, fallback);
    expect(result).toBe(fallback);
  });

  it('should return Date object if input is already a Date', () => {
    const input = new Date();
    const result = toValidDate(input);
    expect(result).toBe(input);
  });
});
