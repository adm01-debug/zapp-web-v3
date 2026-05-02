#!/usr/bin/env node
/**
 * Migration script: Apply all 8 ChatPanel fixes
 * 
 * Run: node scripts/migrate-chatpanel.mjs
 * 
 * This script reads ChatPanel.tsx, applies all 8 critical fixes identified
 * in the May 2026 audit, and writes the result back.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const FILE = resolve('src/features/inbox/components/ChatPanel.tsx');
let content = readFileSync(FILE, 'utf-8');
const original = content;
let fixCount = 0;

function applyFix(name, search, replace) {
  if (!content.includes(search)) {
    console.error(`⚠️  FIX "${name}": search string not found — skipping`);
    return;
  }
  content = content.replace(search, replace);
  fixCount++;
  console.log(`✅ FIX ${fixCount}: ${name}`);
}

// ============================================================
// FIX 1: Add new imports for the fixed hooks
// ============================================================
applyFix(
  'Add new hook imports',
  `import { useSearchParams } from 'react-router-dom';`,
  `import { useSearchParams } from 'react-router-dom';
import { useTransferConversation } from '@/features/inbox/hooks/useTransferConversation';
import { useScheduledMediaUpload } from '@/features/inbox/hooks/useScheduledMediaUpload';
import { useSafeInteractiveMessage } from '@/features/inbox/hooks/useSafeInteractiveMessage';`
);

// ============================================================
// FIX 2: Remove as any casts on openDialog/closeDialog
// ============================================================
applyFix(
  'Remove as any casts',
  `openDialog: openDialog as any, closeDialog: closeDialog as any,`,
  `openDialog: openDialog as (key: string) => void, closeDialog: closeDialog as (key: string) => void,`
);

// ============================================================
// FIX 3: Fix currentUserId hardcoded to 'agent'
// ============================================================
applyFix(
  'Fix currentUserId',
  `currentUserId: 'agent',`,
  `currentUserId: conversation.assignedTo?.id || 'agent',`
);

// ============================================================
// FIX 4: Fix assignedTo: null hardcoded in useAutomations
// ============================================================
applyFix(
  'Fix assignedTo in useAutomations',
  `    assignedTo: null,
  });`,
  `    assignedTo: conversation.assignedTo?.id ?? null,
  });`
);

// ============================================================
// FIX 5: Replace handleTransfer stub with real hook
// ============================================================
applyFix(
  'Replace handleTransfer stub with useTransferConversation',
  `  const handleTransfer = (type: 'agent' | 'queue', targetId: string, message?: string) => {
    toast({ title: 'Chat transferido!', description: type === 'agent' ? 'O chat foi transferido para outro atendente.' : 'O chat foi transferido para outra fila.' });
  };`,
  `  const { transferConversation: handleTransfer } = useTransferConversation({
    contactId: conversation.contact.id,
    whatsappConnectionId,
  });`
);

// ============================================================
// FIX 6: Fix signed URL TTL from 3600 (1h) to 604800 (7 days)
// ============================================================
applyFix(
  'Fix signed URL TTL to 7 days',
  `.createSignedUrl(fileName, 3600);`,
  `.createSignedUrl(fileName, 604800); // 7 days for scheduled messages`
);

// ============================================================
// FIX 7: Add upload error handling in schedule message
// ============================================================
applyFix(
  'Add upload error toast',
  `        const { error: uploadError } = await supabase.storage.from('whatsapp-media').upload(fileName, attachment);
        if (!uploadError) {`,
  `        const { error: uploadError } = await supabase.storage.from('whatsapp-media').upload(fileName, attachment);
        if (uploadError) {
          toast({ title: 'Erro no upload', description: \`Falha ao anexar "\${attachment.name}": \${uploadError.message}\`, variant: 'destructive' });
        }
        if (!uploadError) {`
);

// ============================================================
// FIX 8: Fix poll/contact status from 'sent' to 'sending'
// ============================================================
// Replace first occurrence (onPollSent)
applyFix(
  'Fix onPollSent status to sending',
  `message_type: 'text', sender: 'agent', status: 'sent' }); }}
          onContactSent`,
  `message_type: 'text', sender: 'agent', status: 'sending' }); }}
          onContactSent`
);

// Replace second occurrence (onContactSent)  
applyFix(
  'Fix onContactSent status to sending',
  `message_type: 'text', sender: 'agent', status: 'sent' }); }}
          onOpenCatalog`,
  `message_type: 'text', sender: 'agent', status: 'sending' }); }}
          onOpenCatalog`
);

// ============================================================
// RESULTS
// ============================================================
if (content === original) {
  console.log('\n❌ No changes applied — file may already be patched.');
  process.exit(1);
}

writeFileSync(FILE, content, 'utf-8');
console.log(`\n🎉 ${fixCount} fixes applied successfully to ChatPanel.tsx`);
console.log('   Run `npx tsc --noEmit` to verify TypeScript compilation.');
