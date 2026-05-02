import { describe, it, expect } from 'vitest';
import {
  formatRelative,
  formatMessageGroupDate,
  formatDuration,
  isSameDay,
} from '../dateUtils';

describe('dateUtils', () => {
  describe('formatRelative', () => {
    it('shows "agora" for recent timestamps', () => {
      const now = new Date();
      expect(formatRelative(now)).toBe('agora');
    });

    it('shows minutes for timestamps < 1h', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelative(fiveMinAgo)).toBe('há 5 min');
    });

    it('shows hours for timestamps < 24h', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(formatRelative(twoHoursAgo)).toBe('há 2h');
    });

    it('shows days for timestamps < 7d', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(formatRelative(threeDaysAgo)).toBe('há 3 dias');
    });

    it('shows singular "dia" for 1 day', () => {
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      expect(formatRelative(oneDayAgo)).toBe('há 1 dia');
    });
  });

  describe('formatMessageGroupDate', () => {
    it('shows "Hoje" for today', () => {
      expect(formatMessageGroupDate(new Date())).toBe('Hoje');
    });

    it('shows "Ontem" for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatMessageGroupDate(yesterday)).toBe('Ontem');
    });
  });

  describe('formatDuration', () => {
    it('formats minutes', () => {
      expect(formatDuration(45 * 60 * 1000)).toBe('45min');
    });

    it('formats hours and minutes', () => {
      expect(formatDuration(2.5 * 60 * 60 * 1000)).toBe('2h 30min');
    });

    it('formats days', () => {
      expect(formatDuration(3 * 24 * 60 * 60 * 1000)).toBe('3 dias');
    });

    it('formats singular day', () => {
      expect(formatDuration(1 * 24 * 60 * 60 * 1000)).toBe('1 dia');
    });

    it('shows "agora" for zero', () => {
      expect(formatDuration(0)).toBe('agora');
    });
  });

  describe('isSameDay', () => {
    it('returns true for same day', () => {
      const a = new Date(2026, 4, 2, 10, 0);
      const b = new Date(2026, 4, 2, 22, 0);
      expect(isSameDay(a, b)).toBe(true);
    });

    it('returns false for different days', () => {
      const a = new Date(2026, 4, 2);
      const b = new Date(2026, 4, 3);
      expect(isSameDay(a, b)).toBe(false);
    });
  });
});
