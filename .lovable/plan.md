

## Mini-timeline de SLA por conversa

### O que vai ser construído

Uma seção **"Linha do tempo do atendimento"** no painel lateral de detalhes do contato (`ContactDetails`), exibindo os marcos de SLA da conversa atual com timestamps absolutos, durações relativas, e badges de status (dentro/violado) comparado contra a regra de SLA aplicável.

Marcos exibidos (em ordem):
1. **Primeira mensagem do contato** (abertura)
2. **Primeira resposta do agente** + duração desde abertura + badge SLA 1ª resposta
3. **Última mensagem** (atividade mais recente)
4. **Resolução / encerramento** + duração total + badge SLA resolução
5. **Reabertura** (se houver)

Quando ainda não houver primeira resposta, mostra contador ao vivo (`Aguardando há Xmin`) com cor de urgência.

### Componentes

**1. Hook `src/hooks/useConversationSLATimeline.ts`** (~120 linhas)

Busca via `externalClient`:
- `rpc_list_messages(p_remote_jid, p_instance, p_limit=500)` — pega `created_at` da 1ª inbound, 1ª outbound, e última msg.
- `rpc_list_conversations(p_instance, p_assigned_to=null, p_limit=1)` filtrado pelo `remote_jid` para `closed_at`/`reopened_at` (ou direto da conversation passada).
- `conversation_events` (Lovable Cloud) para `event_type IN ('close','reopen')` como fallback de timestamps.

Retorna:
```ts
interface SLATimelineData {
  firstContactAt: Date | null;
  firstResponseAt: Date | null;
  firstResponseDurationMs: number | null;
  lastMessageAt: Date | null;
  closedAt: Date | null;
  resolutionDurationMs: number | null;
  reopenedAt: Date | null;
  isAwaitingFirstResponse: boolean;
  awaitingMs: number | null;
}
```

`useQuery` com `staleTime: 30_000`, `refetchInterval: 30_000` quando `isAwaitingFirstResponse` (contador ao vivo).

**2. Componente `src/components/inbox/contact-details/SLATimelineSection.tsx`** (~180 linhas)

- Recebe `conversation: Conversation`.
- Internamente usa `useConversationSLATimeline(contact.remote_jid)` + `useApplicableSLA(...)` (já existente) para obter `firstResponseMinutes` e `resolutionMinutes`.
- Renderiza lista vertical (reutiliza padrão visual do `ConversationTimeline.tsx`: linha vertical + dot + ícones Lucide).
- Cada marco:
  - Ícone (MessageCircle / Reply / Clock / CheckCircle2 / RotateCcw)
  - Label PT-BR
  - Timestamp absoluto (`dd/MM HH:mm`)
  - Duração relativa (ex: "respondido em 4min")
  - Badge SLA: `OK` (verde) / `Violado` (destrutivo) / `Em risco` (warning, >70% do prazo) / `—` (sem regra)
- Estado especial "aguardando 1ª resposta": badge pulsante + contador (`formatTimeRemaining` reutilizado).
- Empty state quando sem mensagens via `GenericEmptyState`.
- Loading com `Skeleton` 3 linhas.

**3. Integração em `ContactAccordionSections.tsx`**

Adicionar novo `AccordionItem value="sla-timeline"` entre `'history'` e `'stats'`:
```tsx
<AccordionItem value="sla-timeline">
  <AccordionTrigger>Linha do tempo do atendimento</AccordionTrigger>
  <AccordionContent>
    <SLATimelineSection conversation={conversation} />
  </AccordionContent>
</AccordionItem>
```

Atualizar `ACCORDION_STORAGE_KEY` default em `ContactDetails.tsx` para incluir `'sla-timeline'` na lista de seções abertas por padrão.

### Cálculo de status SLA por marco

```ts
function getSLAStatus(durationMs: number | null, limitMinutes: number): 'ok' | 'warning' | 'breached' | 'na' {
  if (durationMs === null) return 'na';
  const limitMs = limitMinutes * 60_000;
  if (durationMs > limitMs) return 'breached';
  if (durationMs > limitMs * 0.7) return 'warning';
  return 'ok';
}
```

Reaproveita tokens semânticos: `success`, `warning`, `destructive`.

### Detalhes técnicos

- Reutiliza `formatDistanceToNow` de `date-fns/locale/ptBR` (já em uso em `ConversationTimeline`).
- Não cria novas RPCs — usa as já catalogadas (`rpc_list_messages`).
- `remote_jid` derivado de `${contact.phone}@s.whatsapp.net` (padrão do projeto).
- Respeita Core: max ~340 linhas/arquivo, sem `console.log`, tokens semânticos, sem `as any`, identidade por UUID quando possível mas messages busca por JID por compatibilidade com `rpc_list_messages`.
- Acessibilidade: cada item da timeline com `role="listitem"`, container `role="list"` + `aria-label="Marcos de SLA da conversa"`.

### Arquivos

**Criar:**
- `src/hooks/useConversationSLATimeline.ts`
- `src/components/inbox/contact-details/SLATimelineSection.tsx`

**Editar:**
- `src/components/inbox/contact-details/ContactAccordionSections.tsx` — novo `AccordionItem`
- `src/components/inbox/ContactDetails.tsx` — `'sla-timeline'` no array de defaults do accordion

### Fora de escopo

- Histórico cross-conversa (auditoria agregada por contato em todas as conversas históricas) — pode virar lote separado se demandado.
- Export CSV da timeline (Política Zero Export já em vigor).
- Pause/resume de SLA por horário comercial (já tratado no `useApplicableSLA` via outro caminho).

