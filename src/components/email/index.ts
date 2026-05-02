/**
 * Módulo Email Chat — Barrel exports v3 (FINAL)
 *
 * Cobertura completa:
 * - Gmail (Google OAuth2) — useGmail, useGmailOAuthFlow
 * - Outlook (Microsoft Graph API) — useOutlookEmail
 * - IMAP/SMTP genérico — email-imap-bridge Edge Function
 * - Interface unificada — EmailChatInboxUnified, useEmailAccounts
 */

// ── Gmail Components ──────────────────────────────────────────────────────
export { EmailChatInbox }         from './EmailChatInbox';
export { EmailChatThread }        from './EmailChatThread';
export { EmailChatBubble }        from './EmailChatBubble';
export { EmailChatReplyBar }      from './EmailChatReplyBar';
export { EmailThreadList }        from './EmailThreadList';
export { EmailContactPanel }      from './EmailContactPanel';
export { EmailSearchBar }         from './EmailSearchBar';
export { EmailSLABadge }          from './EmailSLABadge';
export { SLADot, SLAProgressBar } from './EmailSLABadge';
export { EmailSignatureEditor }   from './EmailSignatureEditor';
export { EmailAttachmentPreview } from './EmailAttachmentPreview';
export { EmailSLADashboard }      from './EmailSLADashboard';

// ── Outlook Components ────────────────────────────────────────────────────
export { OutlookInboxView }       from './OutlookInboxView';

// ── Unified (Gmail + Outlook) ─────────────────────────────────────────────
export { EmailChatInboxUnified }  from './EmailChatInboxUnified';

// ── Settings ──────────────────────────────────────────────────────────────
export { EmailSettingsPage }      from './EmailSettingsPage';
