

## Filtros na Timeline de SLA

### O que vai ser construído

Adicionar uma barra de filtros compacta no topo do `SLATimelineSection` permitindo:

1. **Filtro de status** (ToggleGroup multi-select): `Todos` · `OK` · `Em risco` · `Violado`
2. **Filtro de período** (ToggleGroup single-select): `24h` · `7d` · `30d` · `Tudo`

Os filtros se aplicam aos marcos da timeline (primeira mensagem, primeira resposta, última atividade, resolução, reabertura). Marcos sem status SLA (`'na'`) só aparecem com filtro `Todos`. O contador "Aguardando 1ª resposta" (live) sempre aparece quando ativo, independente de filtros — é estado operacional crítico.

### Mudanças

**1. `src/components/inbox/contact-details/SLATimelineSection.tsx`** (~+60 linhas, dentro do limite de 340)

- Adicionar estados locais com persistência em `localStorage`:
  ```ts
  const [statusFilter, setStatusFilter] = useState<SLAStatus[]>(['ok','warning','breached','na']);
  const [periodFilter, setPeriodFilter] = useState<'24h'|'7d'|'30d'|'all'>('all');
  ```
  Chave: `sla-timeline-filters` (JSON com ambos).

- Helpers puros:
  ```ts
  const PERIOD_MS = { '24h': 86_400_000, '7d': 604_800_000, '30d': 2_592_000_000, all: Infinity };
  function isWithinPeriod(date: Date | null, period): boolean
  function matchesFilters(milestone: { date: Date|null; status: SLAStatus }, statusFilter, periodFilter): boolean
  ```

- Renderizar barra de filtros logo abaixo do título, usando `ToggleGroup` (já no projeto). Badge com contador de marcos visíveis vs total (`X de Y marcos`).

- Aplicar `matchesFilters` ao array de marcos antes do `.map()` de renderização. Se `filteredMilestones.length === 0` e há marcos no total, mostrar empty state inline: "Nenhum marco corresponde aos filtros" com botão "Limpar filtros".

- Marco "aguardando" (live counter) renderizado fora do filtro — sempre visível quando `isAwaitingFirstResponse`.

### Detalhes técnicos

- `ToggleGroup type="multiple"` para status, `type="single"` para período.
- Variant `outline`, `size="sm"` para densidade compacta no painel lateral (largura 320px).
- Acessibilidade: `aria-label="Filtrar marcos por status"` / `"Filtrar por período"`. Cada toggle com `aria-pressed` automático do Radix.
- Tokens semânticos: `bg-muted/30` para barra de filtros, ícones Lucide (`CheckCircle2`, `AlertTriangle`, `XCircle`, `Filter`).
- Persistência via try/catch (padrão do projeto, ver `ContactDetails.tsx`).
- Sem `console.log`, sem `as any`, sem nova RPC, sem alteração de API pública do componente.

### Arquivo afetado

**Editar:** `src/components/inbox/contact-details/SLATimelineSection.tsx`

### Fora de escopo

- Filtros globais salvos por usuário (server-side) — localStorage atende ao uso por contato.
- Export da timeline filtrada — Política Zero Export.
- Filtro por agente que respondeu — exigiria join Lovable Cloud × FATOR X (impossível em SQL conforme arquitetura).

