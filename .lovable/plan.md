
# Blindar contrato de leitura do Inbox (FATOR X, não Evolution API)

A arquitetura já está correta: Inbox lê de `zapp.evolution_messages` no FATOR X via `queryExternalProxy` → edge `external-db-proxy`. Falta **formalizar** o contrato e **bloquear regressões**. Esta tarefa não altera código de inbox existente.

## Estado atual relevante (já existe)

- `src/lib/externalProxy.ts` — wrapper de leitura.
- Edge `external-db-proxy` deployada.
- `src/pages/admin/AdminInboxSyncStatusPage.tsx` — **já existe** uma versão mais completa que o ANEXO 3 (cobre lag inbound/outbound, contagens 5min/1h/24h, top conversas, falhas). Rota `/admin/inbox-sync-status` registrada em `App.tsx`.
- Imports de `useEvolutionApi` dentro de `src/components/inbox/**` existem em 3 arquivos, mas são **somente para envio/edição** (editMessage, sendStickerMessage, sendPollMessage, sendContactMessage, sendStatusMessage) — o contrato proíbe leitura, não envio.

## O que vou fazer

### 1. Criar `docs/INBOX_READ_CONTRACT.md`
Conteúdo exato do ANEXO 1 (TL;DR, tabela comparativa, fluxos LEITURA/ESCRITA1/ESCRITA2, regras R1–R6, proibições, ordem de diagnóstico, processo de mudança).

### 2. ESLint — bloquear leitura via Evolution API no inbox
Editar `eslint.config.js` adicionando um override scoped:

```text
files: [
  'src/components/inbox/**/*.{ts,tsx}',
  'src/hooks/inbox/**/*.{ts,tsx}',
  'src/pages/Inbox*.{ts,tsx}',
]
```

com `no-restricted-imports` patterns:

- `**/evolution-api/**/find*` e `**/evolution-api/**/list-messages*` → bloqueado com mensagem apontando para `docs/INBOX_READ_CONTRACT.md`.
- **Não bloquear `useEvolutionApi` por completo** — faria 3 arquivos atuais (ChatPanel, AdvancedMessageMenu, MessageContextActions) quebrarem o build, pois usam para **envio** (legítimo pela R2). Em vez disso, bloqueio dirigido a names específicos via `paths` com `importNames`:
  - bloquear apenas exports de leitura caso existissem (`findMessages`, `listMessages`, `findChats` se forem expostos pelo hook). Como `useEvolutionApi` hoje não expõe leitura, fica como **regra defensiva** com comentário explicando o racional.
- Mensagem padrão: `"Inbox lê do FATOR X via externalProxy. Não consulte Evolution API para popular UI. Para envio, use externalMessageSender. Veja docs/INBOX_READ_CONTRACT.md"`.

Isso atende ao espírito do ANEXO 2 sem quebrar a build atual. Documentado no próprio contrato.

### 3. Sidebar — adicionar link "Status do Inbox"
Editar `src/components/sidebar/sidebarNavConfig.ts` adicionando entrada na seção admin apontando para `/admin/inbox-sync-status`, ícone `Activity` (lucide-react). Visível para `admin` e `supervisor`.

### 4. PR template
Editar `.github/PULL_REQUEST_TEMPLATE.md` adicionando seção:

```text
## Compliance de arquitetura
- [ ] Esta PR NÃO faz leitura de mensagens via useEvolutionApi no inbox
- [ ] Toda leitura de inbox passa por queryExternalProxy → external-db-proxy → FATOR X
- [ ] Li e respeito o docs/INBOX_READ_CONTRACT.md
```

### 5. NÃO recriar `InboxSyncStatus.tsx`
A página existente (`AdminInboxSyncStatusPage.tsx`) já é superior ao ANEXO 3 (cobre lag inbound/outbound separados, janelas múltiplas, top conversas, falhas, persistência de threshold). Vou apenas garantir que o link aparece no sidebar. Anoto no contrato que o Card "Realtime" e "Evolution API reachability" do ANEXO 3 podem ser adicionados como follow-up se desejado — não recriar agora para não regredir a UX atual.

## Arquivos

**Novos:**
- `docs/INBOX_READ_CONTRACT.md`

**Editados:**
- `eslint.config.js` — override scoped no inbox com `no-restricted-imports`.
- `src/components/sidebar/sidebarNavConfig.ts` — entrada "Status do Inbox".
- `.github/PULL_REQUEST_TEMPLATE.md` — checklist de compliance.

**Não tocar:**
- Qualquer arquivo em `src/components/inbox/**`, `src/hooks/inbox/**`, `src/pages/Inbox*`.
- `AdminInboxSyncStatusPage.tsx` (já existe, melhor que o anexo).
- `external-db-proxy`, `externalProxy.ts`, `evolution-webhook`, `evolution-api`.

## Fora de escopo (follow-ups opcionais mencionados no contrato)
- Criar `rpc_canary_check` no FATOR X.
- View `v_webhook_health` agregada por instância.
- Card de Realtime + Evolution API reachability no health page.
- Quebrar `evolution-api` em domínios menores.

## Critérios de aceitação
1. `docs/INBOX_READ_CONTRACT.md` existe com o conteúdo do ANEXO 1.
2. ESLint falha ao tentar importar `find-messages`/`list-messages` da Evolution API em arquivos do inbox.
3. Sidebar admin mostra "Status do Inbox" → leva à página existente.
4. PR template tem o checklist de compliance.
5. Build passa sem novos erros (não bloqueamos imports existentes legítimos de envio).
6. Nenhum arquivo do inbox foi modificado.
