/**
 * Módulo Email Chat — Barrel exports completo v2
 *
 * Cobre todos os provedores:
 * - Gmail (Google OAuth2)
 * - Outlook (Microsoft Graph API)
 * - IMAP/SMTP genérico
 */

// Gmail
export { EmailChatInbox } from './EmailChatInbox';
export { EmailChatThread } from './EmailChatThread';
export { EmailChatBubble } from './EmailChatBubble';
export { EmailChatReplyBar } from './EmailChatReplyBar';
export { EmailThreadList } from './EmailThreadList';
export { EmailContactPanel } from './EmailContactPanel';
export { EmailSearchBar } from './EmailSearchBar';
export { EmailSLABadge, SLADot, SLAProgressBar } from './EmailSLABadge';
export { EmailSignatureEditor } from './EmailSignatureEditor';
export { EmailAttachmentPreview } from './EmailAttachmentPreview';
export { EmailSLADashboard } from './EmailSLADashboard';

// Outlook
export { OutlookInboxView } from './OutlookInboxView';

// Settings (Gmail + Outlook + IMAP)
export { EmailSettingsPage } from './EmailSettingsPage';
