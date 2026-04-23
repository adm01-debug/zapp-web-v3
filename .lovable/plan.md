

## Mapa Navegável de Hooks & Funções (20–23 abril 2026)

### O que vai ser entregue

Um documento Markdown único em `/mnt/documents/MAPA_HOOKS_FUNCOES_20-23_ABRIL_2026.md` contendo **tabelas navegáveis** (uma por domínio) com:

| Coluna | Conteúdo |
|---|---|
| **Hook / Função** | Nome + link relativo para o arquivo no repo |
| **Tipo** | hook React / util / componente / edge function |
| **Resumo (1 linha)** | O que faz, em PT-BR |
| **Entradas** | Principais parâmetros |
| **Saídas** | O que retorna |
| **Consumido por** | Componentes/páginas que usam (com links) |
| **Backend tocado** | Lovable Cloud / FATOR X / RPC / edge function |

### Estrutura do documento

1. **Sumário executivo** — quantos hooks novos, quantos editados, agrupamento por domínio
2. **Índice clicável** por domínio (anchors `#sla`, `#dlq`, `#realtime`, etc.)
3. **Tabelas por domínio**:
   - **SLA & Timeline** — `useConversationSLATimeline`, `useSLAAlerts`, `useApplicableSLA` (revisitado)
   - **DLQ & Retry** — `useFailedMessages`, `useFailedMessageAlerts`, `useInstanceRetryConfig`, `evolutionSendRetry`, `retry`, `retryAlerts`
   - **Realtime & Presença** — `useIncomingCallBroadcast`, `useContactTyping`, `useTypingPresence`, `useMessageUpdateBatcher`, `useMessageSendStatus`
   - **Webhook Health** — `useWebhookHealthAlerts`, `webhookHealthAlerts`
   - **War Room & Alertas** — `useWarRoomAlerts` (extensões)
   - **UX/Telemetria/Mobile** — `usePullToRefresh`, `useReturnFocus`, `useScrollDepthTracker`, `useNavSwipeTracker`, `useAttemptCounter`, `useKpiDrilldown`
4. **Mapa de dependências cruzadas** — diagrama Mermaid mostrando quem chama quem
5. **Findings & dívidas técnicas** — bug `oderId`, índice faltante em `conversation_events.event_type`, redundância call listeners
6. **Rodapé** — versão, fontes (planos aprovados + arquivos verificados), próximos passos sugeridos

### Como vou construir (passo a passo)

1. **Verificar existência** de cada hook/util citado nos relatórios anteriores via `code--list_dir` em `src/hooks/`, `src/hooks/realtime/`, `src/hooks/messaging/`, `src/lib/`. Remover do mapa qualquer item que não exista no filesystem (evita inventar).
2. **Inspecionar assinatura** dos hooks-chave com `code--view` para preencher entradas/saídas com precisão (sem inventar tipos).
3. **Buscar consumidores** com `code--search_files` para cada hook (ex: `useFailedMessages\(`) e listar até 3 arquivos consumidores reais.
4. **Gerar diagrama Mermaid** das dependências em `/mnt/documents/MAPA_HOOKS_DEPENDENCIAS.mmd` e referenciar via `<lov-artifact>`.
5. **Escrever o `.md` consolidado** em `/mnt/documents/MAPA_HOOKS_FUNCOES_20-23_ABRIL_2026.md`.
6. **QA**: abrir o arquivo gerado, validar links relativos (formato `src/hooks/...`) e contagens.

### Detalhes técnicos

- Links no formato `[useSLAAlerts](src/hooks/useSLAAlerts.ts)` — clicáveis no preview do Lovable e em qualquer Markdown viewer.
- Tabelas com no máximo 7 colunas para legibilidade mobile.
- Sem emojis nas tabelas (regra do projeto). Status visual via badges textuais: `[NOVO]`, `[EDITADO]`, `[VERIFICADO]`, `[NÃO ENCONTRADO]`.
- Diagrama Mermaid sem cores customizadas (auto-tema light/dark).
- Documento alvo: ~600–900 linhas, ~45–60KB.

### Arquivos afetados

**Criar:**
- `/mnt/documents/MAPA_HOOKS_FUNCOES_20-23_ABRIL_2026.md`
- `/mnt/documents/MAPA_HOOKS_DEPENDENCIAS.mmd`

**Não edita código-fonte** — é tarefa de documentação pura (artifact).

### Fora de escopo

- Refatoração ou correção dos bugs identificados (ex: typo `oderId`) — só documentar; correção exige novo plano.
- Cobertura de hooks anteriores a 20/abr (já existem nos relatórios v1/v2/FINAL).
- Análise de performance ou benchmarks reais — apenas anotações qualitativas baseadas em código.

