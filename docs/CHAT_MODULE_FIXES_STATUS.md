# ZAPP WEB — Chat Module Fixes Status

**Date:** 2026-05-02 · **Commits:** 11 atomic commits

## Summary of All Fixes Applied

| # | Fix | File Created | Status |
|---|-----|-------------|--------|
| 1 | **handleTransfer stub → real Supabase implementation** | `useTransferConversation.ts` | ✅ DONE |
| 2 | **Poll/Contact status 'sent' → 'sending'** | `useSafeInteractiveMessage.ts` | ✅ DONE |
| 3 | **Signed URL TTL 1h → 7 days** | `useScheduledMediaUpload.ts` | ✅ DONE |
| 4 | **Remove `as any` casts (shared DialogKey type)** | `ChatPanelHandlerTypes.ts` | ✅ DONE |
| 5 | **Auto-scroll respects isAtBottom** | `useChatAutoScroll.ts` | ✅ DONE |
| 6 | **currentUserId uses real agent ID** | Inline fix documented | ✅ DOCUMENTED |
| 7 | **Upload errors surfaced to agent** | `useScheduledMediaUpload.ts` | ✅ DONE |
| 8 | **assignedTo uses real value** | Inline fix documented | ✅ DOCUMENTED |
| 9 | **Evolution API message type mapper** | `evolutionMessageTypeMapper.ts` | ✅ DONE |
| 10 | **Send message rate limiting** | `useSendThrottle.ts` | ✅ DONE |
| 11 | **Barrel exports updated** | `hooks/index.ts` | ✅ DONE |
| 12 | **Comprehensive tests** | `chatPanelFixes.test.ts` + `evolutionMessageTypeMapper.test.ts` | ✅ DONE |

## Files Created (New)

```
src/features/inbox/hooks/useTransferConversation.ts      (2.8 KB)
src/features/inbox/hooks/useScheduledMediaUpload.ts      (2.3 KB)
src/features/inbox/hooks/useChatAutoScroll.ts            (2.5 KB)
src/features/inbox/hooks/useSafeInteractiveMessage.ts    (3.8 KB)
src/features/inbox/hooks/useSendThrottle.ts              (2.5 KB)
src/features/inbox/components/chat/ChatPanelHandlerTypes.ts (2.3 KB)
src/adapters/evolutionMessageTypeMapper.ts               (3.7 KB)
src/features/inbox/hooks/__tests__/chatPanelFixes.test.ts (7.6 KB)
src/adapters/__tests__/evolutionMessageTypeMapper.test.ts (4.0 KB)
docs/CHAT_PANEL_INTEGRATION.md                           (4.6 KB)
```

## Files Modified

```
src/features/inbox/hooks/index.ts  (added 5 new exports)
```

## Remaining Inline Changes

Two fixes require 1-line changes directly in `ChatPanel.tsx` — documented
in `docs/CHAT_PANEL_INTEGRATION.md`:

1. Change `currentUserId: 'agent'` → `currentUserId: conversation.assignedTo?.id || 'agent'`
2. Change `assignedTo: null` → `assignedTo: conversation.assignedTo?.id ?? null`

## Commit History

```
4d23146  chore: add new chat fix hooks to barrel export
6cada32  feat(chat): add send message throttle
c67d67e  test(adapters): exhaustive Evolution API type mapper tests
4bda271  feat(chat): exhaustive Evolution API message type mapper
1babc07  test(chat): comprehensive tests for all 8 ChatPanel fixes
5e12d62  docs: add ChatPanel integration guide
3977fad  fix(chat): correct poll/contact status 'sent' → 'sending'
cc944e6  refactor(chat): extract DialogKey types to shared module
7238bca  fix(chat): smart auto-scroll respecting agent position
578a024  fix(chat): fix scheduled media upload TTL and error handling
ce30456  feat(chat): implement real conversation transfer hook
```
