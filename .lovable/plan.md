

## Diagrama navegável — Trilha de Mensagens (send → batching → delivery)

### Entregável

Diagrama Mermaid `flowchart LR` em `/mnt/documents/TRILHA_MENSAGENS_NAVEGAVEL.mmd`, com nós clicáveis (`click NodeId "src/..."`), focado **exclusivamente** no ciclo de vida de uma mensagem outbound/inbound: composição → envio → status bus → retry/DLQ → realtime update → render no bubble.

### Subdomínios (subgraphs)

1. **Composição & Envio (UI)** — `useChatInputLogic`, `messageSender`, `buildSendIdempotencyKey`
2. **Transporte & Retry** — `evolutionSendRetry`, `lib/retry`, `loadRetryConfig`, `enqueueClientFailedMessage`
3. **Status Bus (in-memory)** — `sendStatusBus` (`emitSendStatus`, `subscribeAllSendStatus`, `getSendStatus`)
4. **Persistência & Hooks de leitura** — `useMessages`, `useMessageStatus`, `useMessageSendStatus`
5. **Realtime & Batching** — `useMessageUpdateBatcher`, `useRealtimeMessages`, `realtimeUtils`
6. **Render** — `MessageStatusInline`, `MessageStatusIcon`, `VirtualizedMessageList`, `MessageBubble`
7. **Backends** (cilindros) — `Lovable Cloud (messages)`, `Edge: evolution-api/sendText`, `DLQ: failed_messages`

### Arestas (semântica clara)

- `-->` chamada síncrona / import
- `==>` escrita persistente em DB
- `-.->` evento realtime / pub-sub in-memory
- `-..->` enqueue assíncrona (DLQ)

Fluxo principal representado:

```
ChatInput → messageSender → evolutionSendRetry → Edge sendText
                  ↓                      ↓ (falha)
            emitSendStatus         enqueueClientFailedMessage ==> DLQ
                  ↓                      ↓
         sendStatusBus              (cron reprocess)
                  ↓
useMessageSendStatus / useMessageStatus  ←  useMessages (DB)
                  ↓                            ↑
        MessageStatusInline        useMessageUpdateBatcher -.-> realtime
                  ↓
            MessageBubble (render)
```

### Como vou construir

1. **Verificar existência** dos arquivos via `code--list_dir` em `src/hooks/`, `src/hooks/realtime/`, `src/lib/`, `src/components/inbox/chat/`. Itens inexistentes ficam de fora — sem inventar.
2. **Confirmar assinaturas** com `code--view` em `messageSender.ts`, `useMessageSendStatus.ts`, `useRealtimeMessages.ts` (não vistos nesta sessão) para garantir nomes corretos nos labels.
3. **Confirmar consumidores** com `code--search_files` por: `evolutionSendRetry\(`, `emitSendStatus\(`, `useMessageStatus\(`, `useMessageSendStatus\(`.
4. **Escrever** `/mnt/documents/TRILHA_MENSAGENS_NAVEGAVEL.mmd` com 6 subgraphs + arestas + bloco `click` para cada nó com path relativo.
5. **QA**: validar sintaxe Mermaid (parse local com `@mermaid-js/mermaid-cli` via `nix run` se disponível) e checar que cada `click` referencia arquivo existente.

### Detalhes técnicos

- Sem cores customizadas — auto-tema light/dark.
- Sem emojis (lexer error).
- Limite ~22 nós para legibilidade.
- Labels curtos (≤ 28 chars). Caminhos completos só nos `click`.
- Comentários `%%` no rodapé do `.mmd` com legenda das arestas e timestamp.
- Anotação de dívida técnica: nó `evolutionSendRetry` recebe sufixo `[evolutionSendRetry — fan-out crítico]` (já documentado na matriz anterior).

### Arquivos afetados

**Criar:**
- `/mnt/documents/TRILHA_MENSAGENS_NAVEGAVEL.mmd`

**Não edita código-fonte.**

### Fora de escopo

- Trilhas de mídia/áudio (upload, signed URLs) — domínio separado.
- Fluxos de typing/presença e calls — já mapeados no diagrama anterior.
- Renderização PNG/SVG estática — Lovable renderiza `.mmd` via `<lov-artifact>`.
- Correção do typo `oderId` em `useTypingPresence` — fora deste domínio.

