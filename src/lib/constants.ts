/**
 * Constants used across the ZAPP WEB application.
 *
 * Centralizes magic numbers, limits, and configuration values
 * that were previously scattered across files.
 */

/** Message sending */
export const MESSAGE_SEND_MIN_INTERVAL_MS = 500;
export const MESSAGE_SEND_BURST_LIMIT = 5;
export const MESSAGE_SEND_BURST_WINDOW_MS = 3000;

/** Media upload */
export const SIGNED_URL_TTL_SECONDS = 604800; // 7 days
export const MAX_FILE_SIZE_MB = 64;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** Auto-scroll */
export const SCROLL_BOTTOM_THRESHOLD_PX = 150;

/** Typing presence */
export const TYPING_DEBOUNCE_MS = 500;
export const TYPING_TIMEOUT_MS = 5000;

/** Pagination */
export const MESSAGES_PAGE_SIZE = 50;
export const CONTACTS_PAGE_SIZE = 25;
export const INBOX_PAGE_SIZE = 20;

/** SLA */
export const SLA_WARNING_THRESHOLD_PERCENT = 80;
export const SLA_CRITICAL_THRESHOLD_PERCENT = 95;

/** Retry */
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_RETRY_DELAY_MS = 500;

/** Cache */
export const FEATURE_FLAGS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
export const NETWORK_PING_INTERVAL_MS = 30000; // 30s

/** Performance */
export const LONG_TASK_THRESHOLD_MS = 100;
export const CLS_THRESHOLD = 0.1;

/** Security */
export const MAX_DISPLAY_NAME_LENGTH = 100;
export const MAX_MESSAGE_LENGTH = 10000;

/** Brazilian phone */
export const BRAZIL_COUNTRY_CODE = '55';
export const MIN_PHONE_DIGITS = 10;
export const MAX_PHONE_DIGITS = 15;

/** WhatsApp */
export const WHATSAPP_INDIVIDUAL_SUFFIX = '@s.whatsapp.net';
export const WHATSAPP_GROUP_SUFFIX = '@g.us';

/** UI */
export const HIGHLIGHT_DURATION_MS = 3200;
export const TOAST_DURATION_MS = 5000;
export const SEARCH_DEBOUNCE_MS = 300;
