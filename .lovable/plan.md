# Plano: destravar o preview (build TS quebrado pós-FATOR X)

## Diagnóstico

O preview mostra tela branca **não** por bug de runtime, mas porque o **build TypeScript falha**. O Vite serve a página vazia e o React nunca monta.

A causa raiz é arquitetural: a migração para FATOR X removeu várias tabelas e RPCs do schema do Lovable Cloud (`src/integrations/supabase/types.ts`), mas **112 arquivos** ainda chamam essas entidades pelo client errado:

- `supabase.from('contact_audit_log' | 'conversations' | 'contacts' | 'messages' | 'whisper_messages' | 'app_error_logs' | 'contact_tags' | 'deals' | 'tasks' | ...)`
- `supabase.rpc('find_duplicate_contacts' | 'bulk_update_lead_status' | 'bulk_add_tag' | 'get_contact_conversations' | ...)`

Pela memória do projeto, todo domínio WhatsApp/CRM mora no `externalClient` e deve ser acessado via RPC (`rpc_list_*`, `rpc_get_contact`, `rpc_insert_message` etc.).

## Estratégia em duas fases

### Fase 1 — Destravar o build AGORA (escopo cirúrgico)

Objetivo único: voltar o preview a renderizar. Não vamos refatorar 112 arquivos de uma vez.

Apenas os arquivos que **bloqueiam o bundle inicial** (importados pelo `App.tsx` → `AppRoutes` → boundaries globais) precisam compilar. O resto pode ficar com erros até serem abertos.

Lista mínima identificada nos erros do build atual:

1. `src/components/AppErrorBoundary.tsx` — usa `supabase.from('app_error_logs')` (tabela inexistente).  
   **Ação**: remover o `reportError` para Supabase e logar apenas via `log.error`. (A tabela `app_error_logs` não existe em nenhum dos dois backends.)

2. `src/components/contacts/AuditLogPanel.tsx`, `ContactAuditLogPanel.tsx`, `ContactActivityFeed.tsx`  
   **Ação**: trocar `supabase.from('contact_audit_log')` → `externalClient.rpc('rpc_list_audit_log', { p_entity_type: 'contact', p_entity_id: contactId })`.

3. `src/components/contacts/ContactConversationHistory.tsx`, `ContactDuplicatesPanel.tsx`  
   **Ação**: trocar `supabase.from('conversations')` → `externalClient.rpc('rpc_list_conversations', ...)`.

4. `src/components/contacts/ContactBulkActionsBar.tsx`  
   **Ação**: as RPCs `bulk_update_lead_status` / `bulk_add_tag` / `bulk_remove_tag` não existem no FATOR X. Substituir por loop de `rpc_upsert_contact` (status) e operação direta em `evolution_contact_tags` (quando a RPC existir; senão, desabilitar temporariamente o botão com um toast "em manutenção").

5. `src/components/contacts/ContactConsentManager.tsx`, `ContactDuplicateIndicator.tsx`, `ContactDuplicatesPanel.tsx`  
   **Ação**: trocar `supabase.from('contacts')` → `externalClient.rpc('rpc_get_contact' | 'rpc_upsert_contact' | 'rpc_global_search')`. Para campos LGPD não cobertos por RPC, usar `rpc_upsert_contact` com `p_notes` ou pedir RPC nova ao operador (registrar em `BUGS.md`).

Critério de saída: `tsc --noEmit` (que o harness roda) volta a ficar verde, o Vite bundla e o preview renderiza `/auth`.

### Fase 2 — Backlog (não nesta loop)

Os outros ~107 arquivos serão corrigidos sob demanda, conforme cada tela for aberta. Vou abrir um item em `BUGS.md` listando-os por feature (inbox, calls, deals, tasks, war room, etc.) com o RPC alvo de cada um.

## Detalhes técnicos

- **Padrão de substituição** já documentado em `mem://database/migration/external-fator-x-transition` e no project-knowledge: nunca `JOIN` cross-client; sempre RPC para `evolution_*`.
- **`app_error_logs`**: como a tabela não existe nem no FATOR X nem no Lovable Cloud, vamos manter o ErrorBoundary funcionando com log local. Se quiser persistência, criamos depois uma tabela `app_error_logs` no Lovable Cloud via migration (decisão posterior).
- **Tipos**: nada a fazer em `types.ts` (auto-gerado). Os erros somem assim que as chamadas mudarem para `externalClient.rpc(...)`, que é tipado como `any` por design no FATOR X.
- **Sem mudanças de DB nesta loop** — só código frontend.

## Resultado esperado

- `tsc` passa.
- Preview carrega `LoadingSplash` → redireciona para `/auth` (ou já mostra o Inbox se houver sessão salva).
- Telas ainda não tocadas (kanban, tasks, war room) podem mostrar o `ErrorBoundary` local quando abertas — esperado e tratado na Fase 2.

## Riscos

- Algum arquivo da Fase 1 pode depender de outro arquivo da Fase 2 em runtime e quebrar ao abrir contatos. Mitigação: envolver com `try/catch` e `GenericEmptyState` quando a RPC falhar.
- A funcionalidade "bulk actions" e "duplicates" ficará degradada até as RPCs equivalentes serem criadas no FATOR X — vou sinalizar com toast claro ao usuário.

Posso seguir com a Fase 1?
