

## Filtro de SLA por Fila/Assignee na Timeline

### O que vai ser construído

A timeline hoje resolve UMA regra de SLA via `useApplicableSLA` baseado no estado **atual** da conversa (queue + assignedTo). Mas se a conversa foi reatribuída ao longo do tempo, os marcos antigos foram avaliados sob outra regra. Vou adicionar:

1. **Selector compacto na barra de filtros** com 3 modos:
   - `Atual` (default) — usa fila + agente atuais da conversa (comportamento de hoje)
   - `Por fila` — força resolução só por fila (ignora agente)
   - `Por agente` — força resolução só por agente (ignora fila)
   - `Sem SLA` — desabilita avaliação (todos marcos viram `na`)

2. **Recalcular `firstResponseStatus` e `resolutionStatus`** com base na regra resolvida no modo escolhido.

3. **Persistir** o modo no mesmo `localStorage` key (`sla-timeline-filters`).

4. **Exibir no rodapé** qual escopo foi usado (ex: "Avaliado por: Fila — Suporte N1").

### Por que não buscar regra histórica?

Não temos histórico de reatribuição de fila/agente por conversa no FATOR X (não há tabela `conversation_assignments_history`). Forçar o operador a escolher o escopo é honesto e auditável. Quando histórico existir (lote futuro), trocamos por timeline de regras.

### Mudanças

**1. `src/hooks/useApplicableSLA.ts`** — verificar assinatura atual

Já aceita `queueId` e `agentId` opcionais. Vou apenas passar `null` no campo a ignorar conforme o modo.

**2. `src/components/inbox/contact-details/SLATimelineSection.tsx`** (~+40 linhas)

- Novo state:
  ```ts
  type SLAScope = 'current' | 'queue' | 'agent' | 'none';
  const [scope, setScope] = useState<SLAScope>(initial.scope);
  ```

- Resolver params do hook conforme scope:
  ```ts
  const slaParams = useMemo(() => {
    const base = { contactId: contact.id, company: ..., jobTitle: ..., contactType: ... };
    if (scope === 'queue') return { ...base, queueId: queue?.id ?? null, agentId: null };
    if (scope === 'agent') return { ...base, queueId: null, agentId: assignedTo?.id ?? null };
    if (scope === 'none') return null; // hook recebe enabled=false
    return { ...base, queueId: queue?.id ?? null, agentId: assignedTo?.id ?? null };
  }, [scope, contact, queue, assignedTo]);
  ```

  Se `useApplicableSLA` não tiver `enabled`, passar params vazios resulta em fallback default (5/60min) — aceitável para `'none'` mas vou inspecionar antes para decidir entre `enabled:false` vs zerar limites.

- Quando `scope === 'none'`, forçar `firstResponseStatus = 'na'` e `resolutionStatus = 'na'` independente das durações.

- Adicionar `ToggleGroup type="single"` na barra de filtros com 4 opções (Atual/Fila/Agente/Sem SLA).

- Atualizar o rodapé para mostrar o escopo escolhido + a regra resolvida (ou "—" quando `none`).

- Adicionar `scope` ao JSON salvo em localStorage (com migração defensiva — se ausente, default `'current'`).

### Detalhes técnicos

- Mantém limite de 340 linhas (atual ~340, vou compactar a seção de filtros usando map de configs).
- Tokens semânticos: `data-[state=on]:bg-primary/10` para o toggle ativo do escopo (diferenciar visualmente dos filtros de status).
- Acessibilidade: `aria-label="Escopo da regra de SLA"`.
- Sem `console.log`, sem `as any`, sem nova RPC.
- Não altera API pública do componente.

### Arquivo afetado

**Editar:** `src/components/inbox/contact-details/SLATimelineSection.tsx`

**Inspecionar (read-only):** `src/hooks/useApplicableSLA.ts` (confirmar assinatura + suporte a `enabled`)

### Fora de escopo

- Histórico real de reatribuição (precisa nova tabela + RPC FATOR X).
- Reavaliação por marco individual (cada marco com sua própria regra) — exigiria múltiplas chamadas e não há ganho operacional sem histórico.
- Filtro por intervalo customizado de data — fora do escopo deste lote.

