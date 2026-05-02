/**
 * SafeHtml.tsx — v2.0
 * XSS-safe HTML renderer using DOMPurify.
 * Required by: ContactNotesPanel, ContactSidebarPanel, AuditLogPanel.
 *
 * Allows only: b, i, em, strong, u, br, p, ul, ol, li, span, a
 * Blocks: scripts, iframes, event handlers, style, data-* attributes
 */
import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface SafeHtmlProps {
  html?:      string | null;
  className?: string;
  inline?:    boolean;
  fallback?:  string;
  maxLength?: number;
}

const SAFE_TAGS  = ['b','i','em','strong','u','br','p','ul','ol','li','span','a'];
const SAFE_ATTRS = ['href','target','rel'];
const BLOCKED_ATTRS = [
  'onerror','onload','onclick','onmouseover','onfocus','onblur',
  'onchange','onsubmit','onkeydown','onkeyup','style','class',
];

export const SafeHtml: React.FC<SafeHtmlProps> = ({
  html, className = '', inline = false, fallback = '', maxLength,
}) => {
  const sanitized = useMemo(() => {
    if (!html?.trim()) return '';
    let input = html;
    if (maxLength && input.length > maxLength) input = input.slice(0, maxLength) + '…';
    const clean = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: SAFE_TAGS,
      ALLOWED_ATTR: SAFE_ATTRS,
      FORBID_ATTR:  BLOCKED_ATTRS,
      FORBID_SCRIPTS: true,
    });
    // Force safe link attributes
    return clean.replace(/<a /gi, '<a target="_blank" rel="noopener noreferrer" ');
  }, [html, maxLength]);

  if (!sanitized) {
    return fallback
      ? <span className={`text-muted-foreground text-xs ${className}`}>{fallback}</span>
      : null;
  }

  const Tag = inline ? 'span' : 'div';
  // eslint-disable-next-line react/no-danger
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
};

export default SafeHtml;
