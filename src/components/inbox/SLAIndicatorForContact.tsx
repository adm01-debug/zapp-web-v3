import { SLAIndicator } from './SLAIndicator';
import { useApplicableSLA } from '@/hooks/useApplicableSLA';
import { Conversation } from '@/types/chat';

interface SLAIndicatorForContactProps {
  conversation: Conversation;
  compact?: boolean;
  className?: string;
}

/**
 * Resolves the applicable SLA for the contact (hierarchy: contact > company > job_title > contact_type > queue > agent)
 * and renders the SLAIndicator with those minutes. Falls back to priority-based defaults while loading.
 */
export function SLAIndicatorForContact({ conversation, compact, className }: SLAIndicatorForContactProps) {
  const contact = conversation.contact;
  const { data: applicable } = useApplicableSLA({
    contactId: contact.id,
    company: contact.company ?? null,
    jobTitle: contact.job_title ?? null,
    contactType: contact.contact_type ?? null,
    queueId: conversation.queue?.id ?? null,
    agentId: conversation.assignedTo?.id ?? null,
  });

  const fallbackFr = conversation.priority === 'high' ? 2 : 5;
  const fallbackRes = conversation.priority === 'high' ? 30 : 60;

  return (
    <SLAIndicator
      firstMessageAt={conversation.createdAt}
      firstResponseAt={conversation.status === 'resolved' ? conversation.updatedAt : null}
      resolvedAt={conversation.status === 'resolved' ? conversation.updatedAt : null}
      firstResponseMinutes={applicable?.firstResponseMinutes ?? fallbackFr}
      resolutionMinutes={applicable?.resolutionMinutes ?? fallbackRes}
      compact={compact}
      className={className}
    />
  );
}
