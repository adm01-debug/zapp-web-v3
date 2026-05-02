/**
 * SafeHtml.tsx
 * Renders HTML content safely using DOMPurify.
 * Use for contact notes and any user-generated rich text.
 * NEVER use dangerouslySetInnerHTML without this component.
 */
import React, { useMemo } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';

interface SafeHtmlProps {
  html:       string | null | undefined;
  className?: string;
  as?:        'div' | 'p' | 'span';
  'aria-label'?: string;
}

export const SafeHtml: React.FC<SafeHtmlProps> = ({
  html, className, as: Tag = 'div', 'aria-label': ariaLabel,
}) => {
  const clean = useMemo(() => sanitizeHtml(html ?? ''), [html]);
  if (!clean) return null;
  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: clean }}
      aria-label={ariaLabel}
    />
  );
};

export default SafeHtml;
