# ChatPanel Integration Guide — May 2026 Fixes

This document describes how to integrate the new hooks created to fix critical
gaps in `ChatPanel.tsx`. Each hook was created as a **drop-in replacement** for
the inline logic that had issues.

## Summary of Fixes

| # | Hook | Replaces | Severity |
|---|------|----------|----------|
| 1 | `useTransferConversation` | `handleTransfer` stub | CRITICAL |
| 2 | `useScheduledMediaUpload` | inline `createSignedUrl(…, 3600)` | HIGH |
| 3 | `useChatAutoScroll` | inline `scrollToBottom()` without isAtBottom check | MEDIUM |
| 4 | `ChatPanelHandlerTypes.ts` | inline `DialogKey` type + `as any` casts | HIGH |
| 5 | `useSafeInteractiveMessage` | inline `onPollSent` / `onContactSent` with false `status: 'sent'` | CRITICAL |

## Integration Steps

### 1. Replace `handleTransfer` (CRITICAL)

```tsx
// BEFORE (ChatPanel.tsx — stub that only showed toast):
const handleTransfer = (type: 'agent' | 'queue', targetId: string, message?: string) => {
    toast({ ... });
};

// AFTER:
import { useTransferConversation } from '@/features/inbox/hooks/useTransferConversation';

const { transferConversation: handleTransfer } = useTransferConversation({
    contactId: conversation.contact.id,
    whatsappConnectionId,
});
```

### 2. Replace scheduled media upload (HIGH)

```tsx
// BEFORE (ChatPanel.tsx — 3600s TTL, swallowed errors):
const { error: uploadError } = await supabase.storage.from('whatsapp-media').upload(fileName, attachment);
if (!uploadError) {
    const { data: signedData } = await supabase.storage.from('whatsapp-media').createSignedUrl(fileName, 3600);
    // ...
}

// AFTER:
import { useScheduledMediaUpload } from '@/features/inbox/hooks/useScheduledMediaUpload';

const { uploadScheduledMedia } = useScheduledMediaUpload();

// In handleScheduleMessage:
if (attachment) {
    const { mediaUrl: url, messageType: type } = await uploadScheduledMedia(attachment);
    mediaUrl = url;
    messageType = type;
}
```

### 3. Replace auto-scroll (MEDIUM)

```tsx
// BEFORE (ChatPanel.tsx — always scrolls, interrupts reading):
useEffect(() => {
    if (lastId !== lastMsgIdRef.current) {
        messagesAreaRef.current?.scrollToBottom();
    }
}, [messages]);

// AFTER:
import { useChatAutoScroll } from '@/features/inbox/hooks/useChatAutoScroll';

const { scrollToBottom } = useChatAutoScroll({
    messages,
    isContactTyping,
    messagesAreaRef,
});
```

### 4. Replace DialogKey types (HIGH)

```tsx
// BEFORE (ChatPanel.tsx — inline type, as any casts):
type DialogKey = 'quickReplies' | 'slashCommands' | ...;
openDialog: openDialog as any, closeDialog: closeDialog as any,

// AFTER:
import { DialogKey, dialogReducer, initialDialogState } from './chat/ChatPanelHandlerTypes';
// Remove the inline type definition and use the imported one.
// The `as any` casts are no longer needed because both ChatPanel
// and useChatPanelHandlers can import the same DialogKey type.
```

### 5. Replace poll/contact message insert (CRITICAL)

```tsx
// BEFORE (ChatPanel.tsx — false status: 'sent'):
onPollSent={async (poll) => {
    await supabase.from('messages').insert({
        ..., status: 'sent'
    });
}}

// AFTER:
import { useSafeInteractiveMessage } from '@/features/inbox/hooks/useSafeInteractiveMessage';

const { sendPollRecord, sendContactCardRecord } = useSafeInteractiveMessage({
    contactId: conversation.contact.id,
    whatsappConnectionId,
});

// In JSX:
onPollSent={sendPollRecord}
onContactSent={sendContactCardRecord}
```

### 6. Additional inline fixes (apply directly to ChatPanel.tsx)

These don't require new files — just change the specific lines:

**Fix `currentUserId: 'agent'` → use real agent ID:**
```tsx
// Line ~155: Change:
currentUserId: 'agent',
// To:
currentUserId: conversation.assignedTo?.id || 'agent',
```

**Fix `assignedTo: null` → use real assignment:**
```tsx
// Line ~170: Change:
useAutomations({ ..., assignedTo: null });
// To:
useAutomations({ ..., assignedTo: conversation.assignedTo?.id ?? null });
```

## Verification Checklist

- [ ] Transfer dialog actually updates `contacts.assigned_to` / `contacts.queue_id`
- [ ] Scheduled messages with media have 7-day signed URL TTL
- [ ] Upload errors show destructive toast to agent
- [ ] Auto-scroll doesn't interrupt agents reading history
- [ ] Poll/contact records use `status: 'sending'` not `status: 'sent'`
- [ ] No `as any` casts remain in ChatPanel → useChatPanelHandlers boundary
- [ ] Typing presence uses real agent ID, not hardcoded `'agent'`
- [ ] Automations receive real `assignedTo` value
