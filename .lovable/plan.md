## Objetivo
Adicionar um **checklist de cobertura ponta-a-ponta** (send → batching → delivery → render de status inline) ao final de `TRILHA_MENSAGENS_NAVEGAVEL.mmd`, e fazer com que o regenerador (`scripts/regen-trilha-mensagens.ts`) emita esse mesmo checklist — assim ele sobrevive a futuros `bun run regen:trilha` sem ser apagado.

O checklist será embutido como bloco de comentários Mermaid (`%% ...`) — não quebra o parse e mantém o `.mmd` como única fonte navegável.

## Onde encaixar
`src/test/fixtures/TRILHA_MENSAGENS_NAVEGAVEL.mmd`, logo após o bloco existente "Legenda das arestas" / "Fan-out realtime" e antes do `%% Gerado automaticamente …`.

## Conteúdo do checklist (organizado pelas 6 etapas do diagrama)

```text
%% =====================================================================
%% CHECKLIST DE COBERTURA — send -> batching -> delivery -> render
%% Marque [x] ao validar cada item (manual ou via teste automatizado).
%% =====================================================================
%%
%% 1. Composicao e envio (UI)
%%   [ ] CIL (useChatInputLogic) -> dispara MS.sendMessage com payload normalizado
%%   [ ] MS (messageSender) -> persiste linha 'sending' em DB (==> messages)
%%   [ ] MS -> chama buildSendIdempotencyKey ANTES de ESR
%%   [ ] MS -> emitSendStatus('sending', rowId) no bus
%%
%% 1b. Idempotencia (buildSendIdempotencyKey)
%%   [ ] Gera 'mfp:s256:<hex>' quando ha SendFingerprint completo
%%   [ ] Cai para 'msg:<rowId>' quando fingerprint ausente (call sites legacy)
%%   [ ] timeBucket de 5min => mesma chave em retries dentro da janela
%%   [ ] Mesma chave reutilizada por DLQRP (reprocess-failed-messages)
%%
%% 2. Transporte e retry
%%   [ ] ESR envia Idempotency-Key em todas tentativas do withRetry
%%   [ ] loadRetryConfig respeitado (max attempts / backoff)
%%   [ ] Falha terminal -> enqueueClientFailedMessage (==> failed_messages)
%%   [ ] reprocess-failed-messages reprocessa e atualiza status no DB
%%
%% 3. Status bus (in-memory)
%%   [ ] emitSendStatus chamado nos pontos: optimistic, success, error, retry
%%   [ ] subscribeAllSendStatus alimenta UMSS e UMS
%%   [ ] getSendStatus retorna ultimo estado conhecido por rowId (sync read)
%%
%% 4. Persistencia / leitura
%%   [ ] useMessages carrega historico inicial + aplica realtime
%%   [ ] useMessageStatus mapeia status detalhado por message id
%%   [ ] useMessageSendStatus combina bus in-memory + persistido
%%
%% 5. Realtime e batching
%%   [ ] postgres_changes('messages') registrado pelos 7 hooks + AMP
%%   [ ] useRealtimeMessages -> useMessageUpdateBatcher (coalescing)
%%   [ ] BATCH -.-> useMessages (flush em janela curta, sem perder eventos)
%%   [ ] realtimeUtils dedup por message id (sem update duplicado)
%%   [ ] useTranscriptionNotifications dispara so em UPDATE de transcription
%%   [ ] useRealtimeDashboard / useEvolutionMonitoring nao bloqueiam UI
%%   [ ] AudioMessagePlayer reage a UPDATE de media_url (signed URL refresh)
%%
%% 6. Render de status inline
%%   [ ] MessageBubble consome MessageStatusInline (icone + tooltip)
%%   [ ] MSI reflete: pending -> sent -> delivered -> read -> failed
%%   [ ] MSI atualiza sem remount do bubble (memo estavel por message id)
%%   [ ] VirtualizedMessageList nao re-renderiza lista inteira em UPDATE de 1 msg
%%   [ ] Falha terminal mostra acao 'Reenviar' (consome chave idempotente)
%%
%% Cobertura ponta-a-ponta (smoke):
%%   [ ] Enviar texto -> bubble aparece 'sending' -> 'sent' -> 'delivered' -> 'read'
%%   [ ] Enviar audio -> AMP toca apos UPDATE media_url (sem F5)
%%   [ ] Forcar erro de rede -> retry transparente -> sucesso (mesma chave)
%%   [ ] Forcar erro permanente -> entra DLQ -> cron reprocessa -> status final
%%   [ ] Receber mensagem inbound -> aparece em <=1s sem refresh
```

## Mudanças

1. **`src/test/fixtures/TRILHA_MENSAGENS_NAVEGAVEL.mmd`** — inserir o bloco acima entre a legenda e a linha `%% Gerado automaticamente …` (regenerado pelo script).

2. **`scripts/regen-trilha-mensagens.ts`** — em `renderMmd()`, depois de emitir a legenda e a lista de fan-out, emitir o mesmo bloco de checklist (constante exportada `CHECKLIST_BLOCK: string[]`). Assim:
   - `bun run regen:trilha` mantém o checklist
   - `bun run check:trilha` continua passando (o `stripStamp` já normaliza só o timestamp; o resto do conteúdo é determinístico)

3. Sem mudanças em código de runtime, hooks, testes ou rotas.

## Validação após implementação
- `bun run regen:trilha` → arquivo regenerado idêntico ao esperado, com o checklist presente.
- `bun run check:trilha` → exit 0.
- Abrir `.mmd` em qualquer renderer Mermaid → diagrama renderiza igual (comentários `%%` são ignorados pelo parser).