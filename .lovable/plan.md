

## Tooltip explicativo no badge de SLA

### O que vai ser construído

Adicionar um `Tooltip` ao `SLAIndicatorForContact` que explica de onde vieram os minutos exibidos — qual nível da hierarquia (contato/empresa/cargo/tipo/fila/agente) foi resolvido, o nome da regra e os tempos. Quando estiver em fallback (loading ou sem regra), o tooltip explica o motivo.

### Mudanças

**1. `src/hooks/useApplicableSLA.ts`** — expor o nível resolvido

Adicionar campo `matchedLevel` ao tipo `ApplicableSLA`:

```ts
type MatchedLevel = 'contact' | 'company' | 'job_title' | 'contact_type' | 'queue' | 'agent' | 'global_default' | 'system_default';

export interface ApplicableSLA {
  firstResponseMinutes: number;
  resolutionMinutes: number;
  ruleName: string;
  ruleId: string | null;
  matchedLevel: MatchedLevel;
}
```

- Em `resolveHierarchy`, retornar tupla `{ sla, level }` para cada match e propagar.
- `SYSTEM_DEFAULT.matchedLevel = 'system_default'`; fallback de `sla_configurations` → `'global_default'`.

**2. `src/components/inbox/SLAIndicatorForContact.tsx`** — envolver com Tooltip

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <span className="inline-flex"><SLAIndicator … /></span>
  </TooltipTrigger>
  <TooltipContent side="bottom" className="max-w-xs">
    <SLATooltipContent applicable={applicable} isLoading={isLoading} fallbackFr={fallbackFr} fallbackRes={fallbackRes} priority={conversation.priority} />
  </TooltipContent>
</Tooltip>
```

**3. Sub-componente `SLATooltipContent`** (no mesmo arquivo, ~50 linhas)

Renderiza:
- **Título**: nome da regra (`applicable.ruleName`) ou "Carregando regras…" / "Sem regra específica"
- **Badge do nível** mapeado para PT-BR:
  - `contact` → "Contato específico"
  - `company` → "Empresa: {company}"
  - `job_title` → "Cargo: {jobTitle}"
  - `contact_type` → "Tipo: {contactType}"
  - `queue` → "Fila"
  - `agent` → "Agente atribuído"
  - `global_default` → "Padrão global"
  - `system_default` → "Padrão do sistema (fallback)"
- **Linhas de tempo**: "1ª resposta: Xmin" / "Resolução: Ymin"
- **Hierarquia visual** (lista cinza pequena): "Contato › Empresa › Cargo › Tipo › Fila › Agente" com o nível resolvido em negrito/realce
- **Motivo do fallback** (quando `!applicable`):
  - Se `isLoading`: "Carregando regras de SLA — usando padrões da prioridade ({priority})."
  - Senão: "Nenhuma regra cadastrada cobre este contato. Usando padrão por prioridade ({priority})."

**4. Expor `isLoading`** do `useApplicableSLA` (já vem do `useQuery`, só passar adiante).

### Detalhes técnicos

- Tooltip via `@/components/ui/tooltip` (Radix, já no projeto). Sem novo dep.
- Acessibilidade: `TooltipTrigger asChild` no `<span>` wrapper para preservar layout do badge SLA original.
- Não quebra nenhum dos 4 callsites (`ChatHeader`, `ChatPanelHeader`, `ConversationList`, `ConversationItem`) — assinatura pública do componente é a mesma.
- Tokens semânticos (`text-muted-foreground`, `bg-primary/10`), sem cores hardcoded.
- Arquivo final ~110 linhas, dentro do limite de 340.

### Fora de escopo

- Editor de regras de SLA (já existe em `/admin/sla`).
- Tooltip em `BusinessHoursBadge` (já tem o seu próprio).

