

## Notificações de SLA (Em risco / Violado) para o time comercial

### O que vai ser construído

Quando a timeline detectar que a conversa atual está em **`warning`** ou **`breached`** (1ª resposta ou resolução), disparar uma notificação **uma única vez por conversa+tipo+severidade** para alertar o time comercial. Respeita o escopo (`current` / `queue` / `agent` / `none`) — em `none` não dispara.

### Decisão técnica

Hoje o sistema já tem:
- **War Room alerts** (`useWarRoomAlerts`) — sirene global no header (memória `mem://features/alerts/siren-button`)
- **`toast`** (sonner) para feedback in-app
- **`conversation_events`** — auditoria persistente

Vou usar:
1. **Toast in-app** com ícone + ação "Ver conversa" — feedback imediato pro agente atual
2. **Insert em `conversation_events`** com `event_type='sla_alert'` + metadata (severity, kind, scope, ruleName, durationMs) — auditoria + base pra futuras notificações por canal (email/push)
3. **Anti-spam via `useRef` Set** com chave `${contactId}:${kind}:${severity}` — não re-dispara no mesmo session

Não vou criar tabela nova, edge function, nem cron job. Notificação cross-team (email/push pro time comercial) fica como **nota de roadmap** no rodapé da seção, porque exige decisão de canal (email? Slack? push?) que não foi especificada.

### Mudanças

**1. `src/hooks/useSLAAlerts.ts`** (novo, ~70 linhas)

```ts
interface SLAAlertParams {
  contactId: string | null;
  contactName: string;
  scope: SLAScope;
  firstResponseStatus: SLAStatus;
  resolutionStatus: SLAStatus;
  ruleName: string | null;
  awaitingMs: number | null;
  resolutionDurationMs: number | null;
}

export function useSLAAlerts(params: SLAAlertParams) {
  const firedRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if (params.scope === 'none' || !params.contactId) return;
    
    const fire = (kind: 'first_response' | 'resolution', severity: 'warning' | 'breached', durationMs: number | null) => {
      const key = `${params.contactId}:${kind}:${severity}`;
      if (firedRef.current.has(key)) return;
      firedRef.current.add(key);
      
      // Toast
      const isBreach = severity === 'breached';
      toast[isBreach ? 'error' : 'warning'](
        `SLA ${isBreach ? 'violado' : 'em risco'} — ${params.contactName}`,
        {
          description: `${kind === 'first_response' ? '1ª resposta' : 'Resolução'} · ${formatDurationMs(durationMs)} · ${params.ruleName ?? 'regra padrão'}`,
          duration: isBreach ? 10000 : 6000,
        }
      );
      
      // Audit (best-effort, fire-and-forget)
      supabase.from('conversation_events').insert({
        contact_id: params.contactId,
        event_type: 'sla_alert',
        metadata: { kind, severity, scope: params.scope, ruleName: params.ruleName, durationMs },
      }).then(() => {}, () => {});
    };
    
    if (params.firstResponseStatus === 'warning' || params.firstResponseStatus === 'breached') {
      fire('first_response', params.firstResponseStatus, params.awaitingMs);
    }
    if (params.resolutionStatus === 'warning' || params.resolutionStatus === 'breached') {
      fire('resolution', params.resolutionStatus, params.resolutionDurationMs);
    }
  }, [params.contactId, params.scope, params.firstResponseStatus, params.resolutionStatus]);
}
```

**2. `src/components/inbox/contact-details/SLATimelineSection.tsx`** (~+5 linhas)

- Importar e chamar `useSLAAlerts` com os valores já calculados.
- Sem mudança visual.

### Detalhes técnicos

- `event_type='sla_alert'` é um valor novo aceito pela coluna text — `conversation_events.event_type` não tem CHECK constraint estrito (já aceita `'close'`, `'reopen'`, `'assign'` e outros).
- Insert é `fire-and-forget` (`.then(() => {}, () => {})`) — falha de RLS não quebra a UI.
- `firedRef` reseta na desmontagem (troca de conversa → novo `useRef`), o que é o comportamento desejado: cada vez que abro uma conversa em risco/violada, vejo o alerta uma vez.
- Toasts usam `sonner` (já no projeto) com cor por severidade (`error` para violado, `warning` para em risco).
- Sem `console.log`, sem `as any`, sem nova tabela ou edge function.
- Respeita escopo `'none'` (não dispara).

### Arquivos afetados

**Criar:**
- `src/hooks/useSLAAlerts.ts`

**Editar:**
- `src/components/inbox/contact-details/SLATimelineSection.tsx`

### Fora de escopo

- Notificação por email/push/Slack pro time inteiro — exige escolha de canal e edge function dedicada. Posso adicionar num lote separado se você definir o canal preferido.
- Configuração por usuário ("quero/não quero ser notificado") — não há painel de preferências; pode virar lote.
- Browser notifications (`Notification.permission`) — exige opt-in explícito do usuário.
- Throttle persistente cross-session — `firedRef` é session-scoped por design (cada login vê o estado atual).

