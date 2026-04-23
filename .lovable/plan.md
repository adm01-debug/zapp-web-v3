

## Hardening RLS + gating de UI do painel DLQ

### Estado atual (auditado)

**RLS `failed_messages`** (já existe):
| Cmd | Quem |
|---|---|
| SELECT | `is_admin_or_supervisor` |
| INSERT | `service_role OR admin` |
| UPDATE | `service_role OR admin/supervisor` |
| DELETE | `admin` |

**RPCs `rpc_dlq_*` / `rpc_list_failed_messages`**: todas exigem **`has_role(admin)`** — supervisor é bloqueado mesmo podendo ver via SELECT.

**Frontend**: `failed-messages` está em `VIEW_MAP` (`ViewRouter.tsx`) sem gate de role. Item no `advancedNav` aparece para todos. Página chama RPCs admin-only sem checagem prévia.

**Inconsistência**: política SELECT diz "admin OU supervisor", mas RPCs dizem "só admin". Precisa decidir e alinhar.

### Decisão

- **Visualizar/listar/inspecionar DLQ** → admin **e** supervisor (consistência com SELECT existente e padrão do projeto `is_admin_or_supervisor`)
- **Mutações destrutivas** (`retry_now`, `abandon`, `bulk_abandon`, `DELETE`) → **só admin** (mantém)
- **INSERT** → service_role (edge functions) **OU** `is_admin_or_supervisor` (admin/supervisor podem reenfileirar manualmente se necessário no futuro)
- **UI**: bloquear acesso à view e ocultar item da nav para quem não for admin/supervisor

### Mudanças

**1. Migration — alinhar RLS e RPCs**

```sql
-- INSERT: admite supervisor (alinhado com a UI)
DROP POLICY "Service role and admins can insert failed messages" ON public.failed_messages;
CREATE POLICY "Service role admins and supervisors can insert failed messages"
  ON public.failed_messages FOR INSERT TO authenticated, service_role
  WITH CHECK (auth.role() = 'service_role' OR public.is_admin_or_supervisor(auth.uid()));

-- rpc_list_failed_messages e rpc_dlq_stats: passam a aceitar supervisor
CREATE OR REPLACE FUNCTION public.rpc_list_failed_messages(...) ...
  IF NOT public.is_admin_or_supervisor(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin or supervisor role required';
  END IF;
  -- resto igual

CREATE OR REPLACE FUNCTION public.rpc_dlq_stats() ...
  IF NOT public.is_admin_or_supervisor(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin or supervisor role required';
  END IF;

-- rpc_dlq_retry_now, rpc_dlq_abandon, rpc_dlq_bulk_abandon: mantêm has_role(admin)
-- (ações destrutivas continuam restritas)
```

**2. `src/components/auth/RequireRole.tsx`** (criar se não existir; se existir, reutilizar)

Componente declarativo: recebe `roles: AppRole[]` e `children`. Mostra `loading` enquanto `useUserRole` resolve, renderiza `<NotAuthorizedView/>` (empty state padrão `GenericEmptyState` com ícone Lock) se o usuário não tiver papel; senão renderiza children. Já existe `ProtectedRoute` que faz isso para rotas — vou extrair/reutilizar a lógica como wrapper inline para usar dentro do `VIEW_MAP`.

**3. `src/pages/ViewRouter.tsx`** — gating server-side da view

- Adicionar mapa `VIEW_REQUIRED_ROLES: Record<string, AppRole[]>`:
  ```ts
  'failed-messages': ['admin', 'supervisor'],
  ```
- Em `ErrorBoundaryView`, antes de renderizar o lazy component, checar `useUserRole`. Se não autorizado → `<NotAuthorizedView viewLabel={mod.label}/>`. Se loading → spinner já existente.

**4. `src/components/layout/sidebarNavConfig.ts`** + consumer da nav

- Adicionar campo opcional `requiredRoles?: AppRole[]` em `NavItemConfig`.
- Marcar `failed-messages` com `requiredRoles: ['admin','supervisor']`.
- No componente que renderiza `advancedNav` (Sidebar/AdminView), filtrar items por `useUserRole().hasRole`. Vou localizar o consumer durante implementação (`AdminView` ou similar).

**5. `src/pages/AdminFailedMessagesPage.tsx`** — esconder ações destrutivas para supervisor

- Importar `useUserRole`. Botões "Tentar agora", "Abandonar" (single + bulk) só renderizam se `isAdmin`. Supervisor vê tudo (lista, drawer, payload, KPIs) em modo read-only.
- Banner sutil quando `isSupervisor && !isAdmin`: "Modo somente leitura — ações restritas a administradores."

**6. `src/hooks/monitoring/useFailedMessages.ts`** — defesa em profundidade

- Mutations `retryNow/abandon/bulk*` já vão falhar no servidor para não-admin (RLS + RPC guard). Adicionar pre-check rápido: se não é admin, `toast.error('Ação restrita a administradores')` antes de chamar (evita roundtrip + erro feio).

### Segurança resultante (defesa em camadas)

| Camada | DLQ visualizar | DLQ retry/abandon | DLQ inserir |
|---|---|---|---|
| RLS tabela | admin/supervisor | admin (UPDATE policy permite supervisor mas RPC restringe) | service_role/admin/supervisor |
| RPC guard | admin/supervisor | admin | n/a (insert direto) |
| UI route gate | admin/supervisor | admin (botões hidden) | n/a |
| UI nav gate | admin/supervisor | n/a | n/a |

Não-autorizado: ocultado da nav, bloqueado na rota, falha em RPC, falha em RLS. Quatro camadas.

### Arquivos

**Migration nova** (1):
- Alinhar policy INSERT + relaxar `rpc_list_failed_messages` e `rpc_dlq_stats` para `is_admin_or_supervisor`

**Editados** (4):
- `src/pages/ViewRouter.tsx` — gating por role
- `src/components/layout/sidebarNavConfig.ts` — campo `requiredRoles`
- consumer de `advancedNav` (Sidebar/AdminView — identifico na implementação) — filtro por role
- `src/pages/AdminFailedMessagesPage.tsx` — botões condicionais + banner read-only
- `src/hooks/monitoring/useFailedMessages.ts` — pre-check em mutations

**Criados** (1):
- `src/components/auth/NotAuthorizedView.tsx` — empty state reutilizável (ícone Lock, mensagem clara, botão voltar)

### Fora de escopo

- Sem mudar `send_failures` policies (já corretas).
- Sem alterar `whatsapp_connections` ou outras tabelas de monitoring.
- Sem criar role nova.
- Sem auditoria adicional além da já existente em `rpc_dlq_*`.
- Sem testes E2E de RLS (testes unitários de role-check em `useFailedMessages` ficam para próximo lote se quiser).

