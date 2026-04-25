## Reestruturação dos níveis de acesso

Hoje o sistema tem 4 papéis (`admin`, `supervisor`, `agent`, `special_agent`). Vamos consolidar a hierarquia em **três níveis claros**, conforme você descreveu:

| Nível | Quem é | O que enxerga |
|---|---|---|
| **dev** (antigo `admin`) | Equipe técnica | Tudo: telemetria, logs, webhooks, banco, segurança, monitoramento, informativos do sistema, painéis admin |
| **supervisor** | Líder de equipe | Operação completa do atendimento (inbox, contatos, CRM, relatórios, equipe), sem áreas técnicas |
| **agent** (vendedor) | Atendente final | Apenas seu próprio escopo de atendimento |

O papel `special_agent` (pouco usado, sem semântica clara hoje) será **descontinuado** — quem tiver esse papel será migrado para `agent`.

### O que muda na prática

**1. Banco de dados (migração):**
- Adicionar valor `dev` ao enum `app_role`.
- Migrar todas as linhas `user_roles.role = 'admin'` para `'dev'`.
- Migrar `'special_agent'` para `'agent'`.
- Atualizar a função `has_role` e demais funções `SECURITY DEFINER` que hoje verificam `'admin'` para também aceitarem `'dev'` (ou apenas `'dev'` após migração).
- Atualizar políticas RLS que referenciam `'admin'` → `'dev'`.
- Manter `'admin'` no enum por compatibilidade temporária (só removemos depois que zero código referenciar).

**2. Frontend — hook central de papéis (`useUserRole.ts`):**
- Tipo `AppRole` passa a ser `'dev' | 'supervisor' | 'agent'`.
- Expor `isDev` (substitui `isAdmin`).
- Manter `isAdmin` como **alias deprecado** apontando para `isDev` para não quebrar nada de cara — removemos em uma segunda passada.
- Remover `isSpecialAgent`.

**3. Áreas que passam a ser exclusivas de `dev`:**
   - Telemetria (`AdminTelemetriaPage`, `ClientTelemetryPanel`)
   - Webhook overview, failed messages, rate limit, DLQ, idempotency
   - Crisis Room, Security View / Audit Log
   - Roles Page, permissões, matriz
   - Informativos / changelog do sistema
   - Painéis de monitoramento Evolution
   - Qualquer item da sidebar marcado hoje como "admin only"

   Tudo isso passa a checar `isDev` em vez de `isAdmin`. Itens de sidebar (`sidebarNavConfig.ts`) e rotas em `ViewRouter.tsx` / `App.tsx` ganham gate `requiresDev`.

**4. Áreas que continuam visíveis para `supervisor`:**
   - Inbox completo, contatos, CRM, kanban, relatórios operacionais, equipe, agentes (visualizar/atribuir), CSAT, SLA — sem mudança.

**5. UI auxiliar:**
   - Tela de gestão de usuários (`AdminUsersTable`, `RolesPage`, `InviteAgentDialog`) passa a oferecer os 3 papéis (`dev`, `supervisor`, `agent`) no seletor.
   - Labels em PT-BR: "Desenvolvedor", "Supervisor", "Atendente".

### Detalhes técnicos

- **Migração SQL**: `ALTER TYPE app_role ADD VALUE 'dev'` + `UPDATE user_roles SET role='dev' WHERE role='admin'` + idem para `special_agent → agent`. As funções `has_role` e helpers ficam aceitando ambos durante o período de transição (ou já apenas `dev` se zerarmos no mesmo deploy — preferência abaixo).
- **Testes**: `useUserRole.test.tsx`, `usePermissions.test.tsx`, `ViewRouter.role-gating.test.tsx`, `rlsGroupAccess.test.ts` precisam ser atualizados para refletir `dev`.
- **Refactor amplo mas mecânico**: ~18 arquivos referenciam `isAdmin` / `'admin'` no front. Substituição direcionada por `isDev` mantendo o alias deprecado evita big-bang.

### Pergunta antes de executar

Quer fazer a transição **de uma vez** (renomear admin → dev no mesmo deploy, sem alias) ou em **duas fases** (primeiro adicionar `dev` como sinônimo de `admin` mantendo compatibilidade, depois remover `admin` num deploy seguinte)? A opção de uma vez é mais limpa, a de duas fases é mais segura se houver integrações externas dependendo do nome `admin`.
