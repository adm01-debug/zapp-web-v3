

## Objetivo

Nova tela no inbox, **"Painel de Atendentes"**, mostrando para cada agente:
- Status de presença (online / away / offline)
- Filas em que participa
- Contagem de **mensagens pendentes** (status `pending`/`failed`) atribuídas
- **Últimos envios com idempotência** (com `idem_key`, `http_status`, `external_message_id`, instância)
- E, no topo, um **resumo das conexões WhatsApp** (status + health) para contexto operacional.

Painel read-only, admin/supervisor-only (consistente com `mem://auth/roles-and-visibility`).

## Onde fica

- Rota: `/inbox/agentes-online` (lazy-loaded em `App.tsx`).
- Item no `sidebarNavConfig.ts`, dentro do grupo **Inbox** (Operação), label "Atendentes Online", ícone `Users`, gate por role `admin|supervisor`.
- Não toca o ChatPanel/inbox principal — é uma página irmã.

## Componentes novos

```
src/pages/inbox/AgentsOperationsPage.tsx           ← container da rota
src/components/inbox/agents-ops/
  ├─ AgentsConnectionsHeader.tsx                   ← chips por whatsapp_connection
  ├─ AgentOpsTable.tsx                             ← tabela principal (uma linha por agente)
  ├─ AgentRecentSendsPopover.tsx                   ← sub-detalhes "últimos envios"
  └─ __tests__/AgentOpsTable.test.tsx
src/hooks/inbox/
  ├─ useAgentPendingCounts.ts                      ← messages.status IN (pending|failed) by assigned_to
  └─ useAgentRecentSends.ts                        ← evolution_send_idempotency JOIN messages.id (lookup local)
```

## Fontes de dados (reaproveitando o existente)

| Bloco | Fonte | Hook |
|---|---|---|
| Status / queues / total chats ativos | `profiles` + `queue_members` + `contacts.assigned_to` | `useAgents` (existente) |
| Conexões + health | `whatsapp_connections` (Lovable Cloud) | reusar `useConnectionsManager` (já carrega) |
| Pendentes por agente | `messages` (Lovable Cloud) — `status IN ('pending','failed')` agrupado por `contacts.assigned_to` | **`useAgentPendingCounts` (novo)** |
| Últimos envios c/ idempotência | `evolution_send_idempotency` últimos 50 + JOIN local com `messages` (Lovable Cloud) por `idem_key='msg:<messageRowId>'` para descobrir `assigned_to` | **`useAgentRecentSends` (novo)** |

`useAgentRecentSends`:
1. `select id, idem_key, instance_name, http_status, external_message_id, created_at, path from evolution_send_idempotency order by created_at desc limit 200`
2. Extrai `messageRowId` do `idem_key` (`/^msg:(.+)$/`)
3. Lookup batch `messages.select('id, contact_id, contacts(assigned_to)').in('id', ids)` — Lovable Cloud
4. Agrupa por `contacts.assigned_to`. Retorna `Map<profileId, RecentSend[]>` com no máx. 5 envios por agente
5. `staleTime: 30s` + realtime opcional na tabela (`postgres_changes` em `evolution_send_idempotency` INSERT) para acrescer no topo sem refetch

`useAgentPendingCounts`:
- `select assigned_to, count(*) from messages where status in ('pending','failed') and from_me = true group by assigned_to` — feito client-side via `select('contact_id, status, contacts!inner(assigned_to)')` filtrado, count em `useMemo`.
- `staleTime: 15s`.

## UI

**Header** (`AgentsConnectionsHeader`): linha horizontal de chips, um por `whatsapp_connection`, mostrando `instance_id`, badge colorido (`connected`/`degraded`/`disconnected`), latência (`health_response_ms`). Só renderiza se houver ≥1 conexão.

**Tabela** (`AgentOpsTable`) — uma linha por agente:

| Atendente | Status | Filas | Em atendimento | Pendentes | Últimos envios |
|---|---|---|---|---|---|
| Avatar + nome + role | `online`/`away`/`offline` (badge colorido + dot) | até 3 chips de queue (color+name) com "+N" | `activeChats / max_chats` (Progress) | número (warning se >0) | botão "Ver últimos 5" → popover |

Popover de últimos envios mostra para cada send:
- timestamp curto (`HH:mm:ss`)
- `instance_name` (chip)
- `http_status` (verde 2xx / vermelho 4xx-5xx)
- `idem_key` truncado com tooltip (cópia)
- `external_message_id` (badge se presente, "—" se null)

Vazio: `GenericEmptyState` "Nenhum envio rastreado nesta janela".

**Filtros mínimos** no topo: busca por nome + select de status (`todos`/`online`/`away`/`offline`).

**Auto-refresh**: `refetchInterval: 30s` em ambos os hooks novos. Não usa websocket pesado.

## Segurança & permissões

- Rota gateada via `useUserRole` → `admin|supervisor`. Agentes comuns não veem item no menu nem acessam URL direto (redirect para `/inbox`).
- Idempotency key e `external_message_id` não são PII direta, mas tela respeita política Zero Export — sem botão "exportar CSV". Só tooltip + click-to-copy individual.
- Logs via `log` de `@/lib/logger`, sem `console.log`.

## Testes

`AgentOpsTable.test.tsx`:
1. Renderiza linha por agente passada via prop.
2. Mostra "0" pendentes quando map vazio.
3. Status badge usa cor correta para `online`/`away`/`offline`.
4. Click em "Ver últimos 5" abre popover com `data-testid="recent-sends-popover"`.

`useAgentRecentSends.test.tsx`:
1. Filtra `idem_key` com prefixo `msg:`.
2. Faz lookup em `messages` apenas para os IDs encontrados.
3. Agrupa por `assigned_to`, limita a 5 por agente, ordenado desc por `created_at`.
4. Ignora envios cujo `messages.contact_id.assigned_to` é null.

`useAgentPendingCounts.test.tsx`:
1. Conta apenas `status IN ('pending','failed')`.
2. Conta apenas `from_me = true`.
3. Retorna `Record<profileId, number>` com chaves só para agentes com >0.

## Memória

Após concluir, atualizar `mem://features/inbox/operational-and-ui-standards` para registrar a existência do painel e o gate por role (uma linha — não criar arquivo novo).

## Não-objetivos

- Não cria tabela nova; reusa `evolution_send_idempotency` (já populado pela edge `_shared/send-idempotency.ts`).
- Não implementa "kick agent / forçar logoff".
- Não mostra histórico longo de envios — só janela recente (200 sends top, ~5 por agente).
- Não modifica regra de presença existente (`updated_at` window). Migração para Supabase Presence fica fora do escopo.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| `evolution_send_idempotency` populada apenas para envios que passam pelo proxy `/message/*` — sends locais que falharam antes podem não aparecer | Documentado no header da tela ("Inclui apenas envios processados via Evolution proxy"). |
| Query `messages.in('id', [200 ids])` cara em pico | Limit de 200 sends + `staleTime 30s`. |
| Idem key `msg:<uuid>` muda formato no futuro | Parse já está centralizado em `sendIdempotency.ts`; novo hook depende exclusivamente do prefixo `msg:`. Quebra é detectada por teste unitário. |
| Agente sem `assigned_to` em nenhum contato | Linha aparece com 0/0/0 — comportamento esperado (status presença ainda relevante). |

