

## Polimento da Dead-Letter Queue (DLQ) de envios

### Estado atual (já existe)

- ✅ Tabela `failed_messages` com 15 colunas (status, retry_count, http_status, error_code, error_message, payload, next_attempt_at, etc.)
- ✅ `enqueueFailedMessage()` chamado pelo proxy em 2 pontos (falha transitória + esgotado)
- ✅ Edge function `reprocess-failed-messages` com backoff exponencial (60s → 1h)
- ✅ Hook `useFailedMessages` (filtros por status/instance, realtime, mutations retry/abandon/triggerReprocess)
- ✅ Painel `DLQPanel` (no monitoring) e página `/admin/failed-messages` (full screen)

### Gaps reais

1. **Cobertura de enqueue**: `evolutionSendRetry.ts` (envios diretos via SDK fora do proxy) **não** chama enqueue. Mensagens que falham por aí evaporam.
2. **Sem filtro por motivo**: UI só filtra por status e janela. Não dá pra ver "todas as 429" ou "todos os timeouts".
3. **Sem agrupamento por causa**: lista flat. Operador precisa olhar 50 linhas pra entender que tem um pico de 503 numa instância só.
4. **Sem ação em massa**: retry/abandon é 1 por 1. Pico de 30 falhas vira 30 cliques.
5. **Cobertura ausente em testes**: helper `enqueue-failed-message.ts` sem testes (filtros transient/permanent são frágeis).

### Mudanças

**1. `src/lib/evolutionSendRetry.ts`** — propagar enqueue
- Onde hoje retorna falha final após esgotar retries, chamar uma nova função `enqueueClientFailedMessage(...)` (helper novo no front).

**2. `src/lib/failedMessagesEnqueue.ts`** (novo)
- Mesma lógica do helper Deno mas client-side: insere via `supabase.from('failed_messages').insert(...)` quando o usuário tem permissão (RLS já cobre).
- Filtro idêntico: só POST, só `/message/*`, só erros transitórios (5xx/429/timeout/network).

**3. `src/hooks/monitoring/useFailedMessages.ts`** — filtro por motivo + agregado
- Adicionar `errorCode?: string | null` em `FailedMessagesFilters`. Aplica `.eq('error_code', errorCode)`.
- Adicionar em `aggregates`:
  - `byErrorCode: Array<{ code, count, lastAt }>` ordenado desc.
  - `byInstance: Array<{ instance, count }>` ordenado desc (top 5).
- Mutation nova: `bulkRetry(ids: string[])` e `bulkAbandon(ids: string[])` — update em batch via `.in('id', ids)`.

**4. `src/pages/AdminFailedMessagesPage.tsx`** — UI enriquecida
- Card novo "Top motivos de falha": barras horizontais (mesma estética do `RetryMetricsPanel`) mostrando top 8 `error_code` com contagem.
- Filtro novo `Select` "Motivo" (gerado dinamicamente a partir de `byErrorCode`).
- Coluna de seleção (`Checkbox`) na tabela + barra de ações em massa: "Reprocessar selecionados" / "Abandonar selecionados" (com `AlertDialog` antes do abandon).
- KPI "Top instância afetada" mostrando a #1 de `byInstance`.

**5. `src/components/monitoring/DLQPanel.tsx`** — adaptar
- Reusar o filtro de motivo e os agregados (sem barras — espaço apertado, só badges clicáveis dos top 3 motivos).

**6. `supabase/functions/_shared/__tests__/enqueue-failed-message.test.ts`** (novo)
- Cobre `isTransientFailure`: 200→false, 429→true, 503→true, 400→false, 401→false, timeout→true, network_error→true, undefined→false.
- Cobre `isSendPath`: `/message/sendText`→true, `/instance/connect`→false.
- Cobre filtro de método: GET ignorado.

### Comportamento

| Cenário | Antes | Depois |
|---|---|---|
| Pico de 429 numa instância | 20 linhas misturadas | Filtro "429" + barra mostra causa raiz |
| 30 falhas pra reprocessar | 30 cliques | 1 click "Selecionar todos" + "Reprocessar" |
| Falha em `evolutionSendRetry` (SDK direto) | Some no vazio | Vai pra DLQ via helper client |
| Operador quer ver só timeouts | Impossível | Select "Motivo: timeout" |
| Tabela com 100 itens, 4 codes | Lista plana | Top 4 visualmente proeminente |

### Arquivos editados/criados

- `src/lib/failedMessagesEnqueue.ts` (novo)
- `src/lib/evolutionSendRetry.ts` (chamada nova)
- `src/hooks/monitoring/useFailedMessages.ts` (filtro + agregados + bulk mutations)
- `src/pages/AdminFailedMessagesPage.tsx` (UI nova: gráfico, filtro motivo, seleção em massa)
- `src/components/monitoring/DLQPanel.tsx` (badges clicáveis de motivo)
- `supabase/functions/_shared/__tests__/enqueue-failed-message.test.ts` (novo)

### Fora de escopo

- Não toco em `reprocess-failed-messages` (já funciona, pg_cron a cada 15min).
- Não muda schema da tabela (todas as colunas necessárias já existem).
- Sem export CSV (cobertura "Zero Export").
- Sem alerta automático por pico de DLQ (já existe `check_send_failure_spike` para `send_failures`; DLQ separada por design).

