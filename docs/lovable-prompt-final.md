# 🚀 LOVABLE PROMPT — Integração ZAPP WEB Contacts v3.0

## Copie este prompt completo e envie ao Lovable AI

---

**PROMPT:**

Preciso que você integre o Módulo de Contatos v3.0 no ZAPP WEB. Todos os novos componentes já estão no repositório GitHub. Execute estas integrações sequencialmente:

## PASSO 1: Instalar dependências

Execute no terminal:
```bash
npm install dompurify @types/dompurify @tanstack/react-virtual libphonenumber-js
```

## PASSO 2: Atualizar a rota de Contatos

No arquivo de rotas principal (App.tsx ou similar), substituir:
```tsx
// ANTES:
import ContactsView from '@/components/contacts/ContactsView';
// ...
<Route path="/contacts" element={<ContactsView />} />

// DEPOIS:
import ContactsPageV3 from '@/components/contacts/ContactsPageV3';
// ...
<Route path="/contacts" element={<ContactsPageV3 workspaceId={workspaceId} onOpenChat={(id) => navigate(`/chat/${id}`)} />} />
```

## PASSO 3: Atualizar o painel 360° no Inbox

No arquivo do Inbox (InboxView.tsx ou similar), substituir o componente de detalhes do contato:
```tsx
// ANTES: qualquer componente de detalhes antigo
// DEPOIS:
import ContactSidebarPanel from '@/components/contacts/ContactSidebarPanel';
// ...
<ContactSidebarPanel 
  contact={selectedContact} 
  onEdit={() => setEditingContact(selectedContact)} 
  onOpenChat={() => openConversation(selectedContact.id)} 
/>
```

## PASSO 4: Garantir que as importações de lib estejam corretas

Verificar que os arquivos existentes que importam de `@/lib/sanitize` e `@/lib/csvUtils` continuam funcionando (os arquivos foram atualizados mas mantêm as mesmas exportações).

## PASSO 5: Executar as migrations Supabase

No terminal:
```bash
node scripts/run-contacts-migrations.mjs
supabase functions deploy contacts-import  
supabase functions deploy lgpd-scheduled-jobs
```

## PASSO 6: Testar

```bash
npm run test -- src/lib/__tests__/ src/components/contacts/__tests__/
npm run build
```

Confirme cada passo e informe qualquer erro encontrado.

---

## Componentes novos disponíveis (já no repositório):

- `ContactsPageV3.tsx` — Página completa com abas, filtros, virtual scroll
- `ContactFormV3.tsx` — Formulário com 3 abas, LGPD, multi-phones
- `ContactsTableVirtual.tsx` — Virtual scroll 100k+ contatos
- `ContactFilterBar.tsx` — Barra de filtros avançada
- `ContactExportDialog.tsx` — Export CSV com seletor de colunas
- `ContactSidebarPanel.tsx` — CRM 360° com atividade/LGPD/histórico
- `DuplicateContactsPanel.tsx` — Varredura de duplicatas
- `ContactRecycleBin.tsx` — Lixeira com restauração
- `AuditLogPanel.tsx` — Histórico LGPD Art.37
- `ContactActivityFeed.tsx` — Timeline de atividades
- `ContactsErrorBoundary.tsx` — Error boundary
- `ContactSkeletonLoader.tsx` — Skeletons de loading
- `ContactMergeDialog.tsx` — Merge de contatos
- `ConflictResolutionDialog.tsx` — Edição concorrente
- `ContactPhoneManager.tsx` — Múltiplos telefones
- `ContactConsentManager.tsx` — Consentimento LGPD
- `SafeHtml.tsx` — HTML seguro XSS

## Hooks novos:
- `useContactsPaginationV2.ts`
- `useDuplicateDetector.ts`
- `useContactUndoDelete.ts`
- `useRetryOperation.ts` (em src/hooks/)

## Libs atualizadas:
- `src/lib/sanitize.ts` v2.0 — DOMPurify completo
- `src/lib/csvUtils.ts` v2.0 — RFC4180 + CSV injection prevention
- `src/lib/phoneUtils.ts` v2.0 — 67 DDDs + 9th digit + JID
