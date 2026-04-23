

## Matriz de dependências hooks ↔ módulos (20–23 abr)

### Entregável

Documento Markdown único em `/mnt/documents/MATRIZ_DEPENDENCIAS_HOOKS_20-23_ABRIL_2026.md` contendo uma **matriz tabular** com sentido de chamada explícito (`→` chama, `←` é chamado por, `↔` bidirecional/realtime).

### Estrutura

1. **Legenda de símbolos**
   - `→` chamada síncrona (import + invocação)
   - `⇒` persistência/escrita em DB
   - `⇠` leitura via RPC
   - `⤳` realtime/broadcast (assíncrono)
   - `⊕` consumido por componente UI

2. **Matriz principal** (tabela ampla, uma linha por hook/util do escopo 20–23):

| Origem | Sentido | Destino | Tipo | Backend |
|---|---|---|---|---|
| [useSLAAlerts](src/hooks/useSLAAlerts.ts) | ⇒ | `conversation_events` | insert | Lovable Cloud |
| [useSLAAlerts](src/hooks/useSLAAlerts.ts) | ← | [SLATimelineSection](src/components/inbox/contact-details/SLATimelineSection.tsx) | consumo UI | — |
| [useConversationSLATimeline](src/hooks/useConversationSLATimeline.ts) | ⇠ | `rpc_list_messages` | RPC | FATOR X |
| [evolutionSendRetry](src/lib/evolutionSendRetry.ts) | → | [lib/retry](src/lib/retry.ts) | util | — |
| [evolutionSendRetry](src/lib/evolutionSendRetry.ts) | ⤳ | `enqueueClientFailedMessage` (DLQ) | enqueue | Lovable Cloud |
| [useIncomingCallBroadcast](src/hooks/useIncomingCallBroadcast.ts) | ⤳ | `externalSupabase.channel()` | broadcast | FATOR X |
| ... | ... | ... | ... | ... |

3. **Submatrizes por domínio** (filtros prontos para o leitor):
   - SLA & Timeline
   - DLQ & Retry
   - Realtime & Presença
   - Webhook Health
   - UX/Telemetria

4. **Matriz reversa "consumido por"** — para cada hook, lista até 3 componentes/páginas que o importam (descobertos via `code--search_files`).

5. **Quadro-resumo de acoplamento**:
   | Hook | Fan-out (chama N) | Fan-in (chamado por N) | Risco |
   |---|---:|---:|---|
   | `useFailedMessages` | 2 | 4 | médio |
   | ... | | | |

6. **Findings de dependência**:
   - Acoplamento crítico: `evolutionSendRetry` → `loadRetryConfig` → `failedMessagesEnqueue` (cadeia de 3 níveis sem fallback claro)
   - Hook órfão suspeito: itens com fan-in = 0
   - Bug `oderId` em `useTypingPresence` afeta consumidores em cascata

### Como vou construir

1. **Verificar arquivos** com `code--list_dir` em `src/hooks/`, `src/hooks/realtime/`, `src/lib/` (pular itens inexistentes — sem inventar).
2. **Mapear fan-out** lendo cada hook com `code--view` e extraindo imports relevantes.
3. **Mapear fan-in** com `code--search_files` por nome de cada hook (ex: `useSLAAlerts\(`).
4. **Escrever** o `.md` em `/mnt/documents/MATRIZ_DEPENDENCIAS_HOOKS_20-23_ABRIL_2026.md`.
5. **QA**: validar que cada link em `[texto](path)` aponta para arquivo existente; conferir que não há linha duplicada.

### Detalhes técnicos

- Links relativos no formato `[nome](src/...)` — clicáveis no preview do Lovable.
- Sem emojis nas tabelas (regra do projeto). Símbolos Unicode `→ ⇒ ⇠ ⤳ ⊕ ↔ ←` são seguros.
- Tabelas com no máximo 5 colunas para legibilidade mobile.
- Documento alvo: ~400–600 linhas, ~30–45 KB.
- Badges textuais: `[NOVO]`, `[EDITADO]`, `[BUG]`, `[ÓRFÃO]`.

### Arquivos afetados

**Criar:**
- `/mnt/documents/MATRIZ_DEPENDENCIAS_HOOKS_20-23_ABRIL_2026.md`

**Não edita código-fonte.**

### Fora de escopo

- Diagrama visual (já entregue em `MAPA_HOOKS_DEPENDENCIAS_NAVEGAVEL.mmd`).
- Análise de hooks anteriores a 20/abr.
- Refatoração para reduzir acoplamento — apenas documentar.

