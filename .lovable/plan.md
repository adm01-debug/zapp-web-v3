
## Objetivo

Conseguir testar manualmente no preview as telas **Contatos**, **Conversas** e **Audit Log** confirmando que os dados carregam do self-hosted (FATOR X). Hoje o build está quebrado por ~30 erros TS pré-existentes na pasta `src/components/contacts/*`, então o preview não roda e nenhum teste manual é possível.

A causa raiz é a mesma em quase todos os arquivos: **chamadas diretas a `supabase.rpc('nome_fatorx', ...)` e `supabase.from('view_fatorx')`** que não existem no Lovable Cloud (typings só conhecem o schema do Cloud). A solução padrão definida nos lotes anteriores é rotear via `dbRpc`/`dbList`/`dbGet`/`dbInsert` + `rpcCatalog`, e leituras de view do FATOR X via `dbFrom('audit_log' | ...)`.

## Escopo (apenas o necessário para destravar o build e testar as 3 telas)

### 1. Migrar componentes de Contatos para `dbRpc`/`rpcCatalog`

Adicionar entradas faltantes no `rpcCatalog.ts` (todas com `client: 'external'`) e trocar chamadas:

- `get_contact_conversations` → `ContactActivityFeed.tsx`
- `bulk_update_lead_status`, `bulk_add_tag` → `ContactBulkActionsBar.tsx`
- `find_duplicate_contacts` → `ContactDuplicatesPanel.tsx` (+ tipar retorno como array para `.map`)
- `update_contact_versioned` → `ContactFormModal.tsx`, `ContactFormV3.tsx`
- `get_contact_notes`, `add_contact_note` → `ContactNotesPanel.tsx`
- `restore_contact` → `ContactRecycleBin.tsx`
- `get_contact_stats`, `get_lgpd_compliance_stats`, `get_duplicate_report` → `ContactStatsDashboard.tsx`
- `v_deleted_contacts` (view) → `ContactRecycleBin.tsx` via `dbFrom('deleted_contacts')` (nova entidade no `registry.ts` apontando para `client: 'external'`, `table: 'v_deleted_contacts'`)

### 2. Corrigir tipagens de validadores e merges

Vários arquivos desestruturam `{ valid, error, normalized, formatted, type, version }` de funções que hoje retornam `boolean`. Ajustar:

- `ContactFormModal.tsx`, `ContactFormV3.tsx`: trocar consumo dos validadores (`validatePhone`, `checkConflict`) para os retornos ricos já existentes em `src/lib/contactValidators` (assinatura `{ valid, error, normalized, formatted, type, version }`). Onde o validador realmente retorna `boolean`, manter, mas remover o destructuring.
- `ContactImportDialogV2.tsx` e `ContactMergeDialog.tsx`: remover casts `as Record<string, unknown>` desnecessários sobre o `SupabaseClient` / `ContactForMerge`.

### 3. Tipo `Contact` em `ContactSidebarPanel.tsx`

Os campos `total_messages`, `first_contact_at`, `merge_source_id` não existem no tipo `Contact` central. Opções:

- Estender `src/components/contacts/types.ts` (`Contact`) com esses campos como opcionais (`total_messages?: number | null`, `first_contact_at?: string | null`, `merge_source_id?: string | null`), já que vêm do FATOR X (`evolution_contacts` + agregados).

### 4. `ContactRecycleBin.tsx` — TS2589 "excessively deep"

Após trocar a leitura para `dbFrom('deleted_contacts')` (que é tipado como `any`), o erro de profundidade some. Confirmar removendo o `select<...>()` genérico se houver.

### 5. Após build verde — Teste manual no preview

Com o app rodando, executar:

1. **Login** com usuário admin no preview.
2. **/contacts** — verificar:
   - Lista carrega via `rpc_list_contacts` (rede mostra POST a `supabase.atomicabr.com.br/rest/v1/rpc/rpc_list_contacts`).
   - Abrir um contato → `AuditLogPanel` deve listar entradas (lê `evolution_audit_log` via `dbFrom('audit_log')`).
   - `ContactStatsDashboard`, `ContactNotesPanel` e `ContactActivityFeed` devem carregar sem erro no console.
3. **/inbox** — verificar:
   - Lista de conversas via `rpc_list_conversations`.
   - Selecionar uma conversa → mensagens via `rpc_list_messages` com paginação incremental (scroll para cima dispara nova `range`).
4. Conferir console e network: nenhum 401/404 vindo do self-hosted, todas chamadas FATOR X com header `apikey` correto.
5. Reportar resultado (prints + breve checklist de cada tela).

## Fora de escopo

- Outros erros TS fora de `src/components/contacts/*` (se aparecerem após estes fixes, abrir lote separado).
- Refactor de UI/UX dessas telas — apenas o mínimo para compilar e testar.
- Criar novas RPCs no FATOR X. Todas as RPCs listadas acima já existem (são chamadas diretas hoje, só faltam no catálogo).

## Detalhes técnicos

- `rpcCatalog.ts`: cada nova entrada segue o padrão existente:
  ```ts
  getContactNotes: { name: 'get_contact_notes', client: 'external' } as RpcDefinition<{ p_contact_id: string }, ContactNote[]>,
  ```
- `registry.ts`: adicionar `deleted_contacts: { client: 'external', table: 'v_deleted_contacts' }` em `ENTITY_MAP` e em `LogicalEntity`.
- Não tocar em `src/integrations/supabase/client.ts` nem `types.ts` (auto-gerados).
- Manter convenção: leitura/escrita FATOR X **sempre** via `dbRpc`/`dbList`/`dbGet`/`dbInsert`; views FATOR X via `dbFrom`.

## Entregáveis

1. Build TypeScript verde (`tsc --noEmit` sem erros nos arquivos listados).
2. Preview navegável em `/contacts` e `/inbox`.
3. Relatório curto do teste manual (status de cada uma das 3 telas + qualquer regressão observada).
