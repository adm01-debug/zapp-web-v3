/**
 * Date formatting utilities for ZAPP WEB.
 *
 * Provides consistent, locale-aware date formatting across
 * the entire application (Inbox, CRM, SLA, CSAT, etc.).
 */

const LOCALE = 'pt-BR';

/** Format: 02/05/2026 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(LOCALE);
}

/** Format: 14:30 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
}

/** Format: 02/05/2026 14:30 */
export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

/** Format: "há 5 min", "há 2h", "há 3 dias", "02/05/2026" */
export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHour < 24) return `há ${diffHour}h`;
  if (diffDay < 7) return `há ${diffDay} ${diffDay === 1 ? 'dia' : 'dias'}`;
  return formatDate(d);
}

/** Format: "Seg", "Ter", "Qua", etc. */
export function formatWeekday(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(LOCALE, { weekday: 'short' });
}

/** Format: "Segunda-feira, 02 de maio de 2026" */
export function formatFullDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(LOCALE, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/** Returns "Hoje", "Ontem" or formatted date for message grouping */
export function formatMessageGroupDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(d, today)) return 'Hoje';
  if (isSameDay(d, yesterday)) return 'Ontem';
  return formatFullDate(d);
}

/** Check if two dates are on the same day */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Format SLA duration: "2h 30min", "45min", "5 dias" */
export function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const totalHour = Math.floor(totalMin / 60);
  const totalDay = Math.floor(totalHour / 24);

  if (totalDay > 0) return `${totalDay} ${totalDay === 1 ? 'dia' : 'dias'}`;
  if (totalHour > 0) return `${totalHour}h ${totalMin % 60}min`;
  if (totalMin > 0) return `${totalMin}min`;
  return 'agora';
}
