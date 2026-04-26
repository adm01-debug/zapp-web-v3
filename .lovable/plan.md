## Objetivo

Ampliar a suíte Playwright para cobrir, **por módulo**, os 5 fluxos críticos de qualquer recurso: **Login → Navegação → Criação → Edição/Submissão → Tratamento de erro**, complementando os specs já existentes (auth, send-message, inbox, admin filters, DLQ, retry).

## Cobertura atual vs. nova

| Módulo | Existe | Adicionar |
|---|---|---|
| Auth | ✅ smoke | + reset-password, rota inválida → 404 |
| Navegação global | ❌ | ✅ sidebar/rotas principais, deep-link, role gating |
| Contatos (CRM) | ❌ | ✅ criar via "Nova conversa", editar nome, busca, dedupe |
| Inbox | ✅ | + atribuir agente, fechar atendimento, erro de envio |
| Filas (admin) | ❌ | ✅ pausar/retomar, criar fila, validação |
| Departamentos | ❌ | ✅ CRUD básico |
| Canais | ❌ | ✅ listar, alternar status |
| Tratamento de erro | parcial | ✅ 500 do edge → toast, network offline → fallback, ErrorBoundary |

Total de novos specs: **6 arquivos**, ~25 testes determinísticos, todos `test.skip` se papel insuficiente para não falsar CI.

## Arquivos a criar

### 1) `e2e/navigation.spec.ts`
- Login → home renderiza sidebar.
- Clica em cada item principal (Inbox, CRM, SLA, Operações) → URL muda + heading da página visível.
- Deep-link `/sla` autenticado → carrega direto sem redirecionar.
- Rota inexistente `/rota-que-nao-existe` → componente NotFound.
- Role gating: `/admin/roles` para usuário não-admin → redireciona ou exibe acesso negado.

### 2) `e2e/contacts-crud.spec.ts`
- Mock de `evolution-api` (send-text) e `batch-fetch-avatars`.
- Criar contato novo via "Nova Conversa" (modo `novo contato`) → aparece na lista.
- Tentar criar duplicado com mesmo telefone → toast de erro "Já existe".
- Editar nome do contato (se UI exposta) — `test.skip` se não disponível.
- Busca por nome/telefone retorna resultados em < 1s.

### 3) `e2e/admin-queues.spec.ts`
- Skip se não-admin.
- Acessar `/admin/queues`.
- Criar fila com nome de teste (`E2E Queue ${ts}`).
- Pausar → status visível como pausada → retomar.
- Validação: criar com nome vazio → erro inline.
- Cleanup via `cleanupTestData()`.

### 4) `e2e/admin-channels.spec.ts`
- Skip se não-admin.
- Acessar `/admin/channels`.
- Listar canais existentes → contador > 0.
- Alternar status de um canal de teste (pausar/reativar) → toast de sucesso.

### 5) `e2e/error-handling.spec.ts`
- Edge function 500 ao enviar mensagem → toast "Erro ao enviar".
- Edge function timeout → estado `failed` na bolha.
- Network offline (`page.context().setOffline(true)`) durante envio → mensagem em fila local + reconexão recupera.
- Forçar erro de render numa rota debug → ErrorBoundary mostra fallback com botão "Tentar novamente".

### 6) `e2e/auth-extended.spec.ts`
- "Esqueci senha" abre `/forgot-password`, submete email → toast de confirmação.
- Login com credenciais inválidas → mensagem de erro visível, permanece em `/auth`.
- Sessão expira (limpa cookies) → próxima ação navega para `/auth`.

## Arquivos a editar

**`e2e/utils/supabase.ts`** — estender `cleanupTestData()` para também remover filas e canais com prefixo `e2e-`.

**`docs/testing/e2e.md`** — adicionar entradas na tabela de specs.

**`playwright.config.ts`** — sem mudanças (config já adequada).

## Padrões aplicados

- Todos os specs autenticados usam `test` de `./fixtures/auth` (storage state reaproveitado).
- Mocks de Evolution/Cloud via `page.route('**/functions/v1/{evolution-api,whatsapp-cloud-api}**', ...)`.
- `test.skip(true, 'motivo')` quando perfil/feature não disponível — nunca falha falso-positivo.
- Dados de teste prefixados (`e2e-`, `*-test`) para cleanup automático.
- Asserções com `expect.poll()` (timeout 10s) para estados realtime.
- Sem chamadas reais a Evolution/Meta — tudo mockado.

## Critério de aceite

- `npx playwright test e2e/navigation e2e/contacts-crud e2e/admin-queues e2e/admin-channels e2e/error-handling e2e/auth-extended` verde local.
- Nenhum spec novo adiciona > 30s ao tempo total do CI.
- Os 2 shards CI continuam sob 10 min cada.