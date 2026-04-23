

## Corrigir botão "Reconectar" do banner de desconexão

### Problema

A instância `wpp2` aparece desconectada e o botão **"Reconectar"** do banner topo (`EvolutionDisconnectBanner`) não funciona. Mostra toast de sucesso mas nada acontece no backend.

**Causa raiz**: o componente invoca a edge function com **caminho aninhado inválido**:

```ts
supabase.functions.invoke('evolution-api/instance/connect', {
  method: 'POST',
  body: { instanceName: conn.instance_id },
});
```

A edge function se chama apenas `evolution-api` e roteia internamente via `body.action`. O nome `'evolution-api/instance/connect'` não existe → request falha (404), mas o `try/catch` mostra `toast.success` antes de validar `error` corretamente em alguns caminhos, ou o erro é silenciado.

Além disso, mesmo se o `connect` rodasse, ele apenas gera QR code no servidor — o usuário precisa **escanear** o QR. Hoje o banner diz "Escaneie o QR Code na tela de conexões" mas não leva o usuário até lá nem abre o dialog de QR.

### Mudança 1 — `src/components/alerts/EvolutionDisconnectBanner.tsx`

Substituir `handleReconnect` para:

1. Usar o contrato correto da edge function:
   ```ts
   const { data, error } = await supabase.functions.invoke('evolution-api', {
     body: { action: 'connect', instanceName: conn.instance_id },
   });
   ```
2. Em vez de só mostrar toast, **navegar o usuário para `/connections`** (ou disparar o evento `navigate-view` com detail `'connections'`, padrão já usado em `DegradedQuickActions`) para que ele veja o card e o QR Code apareça.
3. Tratar erro real: se `error` ou `data?.error === true`, exibir `toast.error` com a mensagem retornada (envelope `EvolutionErrorEnvelope.message`).

### Mudança 2 — Confirmar consistência

Verificação adicional: `MonitoringConnectionsList.reconnectInstance` usa `action: 'restart-instance'` que é diferente — apenas reinicia o processo na Evolution API sem gerar QR. Documentar no comentário que o banner usa `connect` (gera QR) enquanto monitoring usa `restart-instance` (recupera sessão sem rescan), e manter ambos como estão. Sem mudança de código aqui.

### Verificação

1. Recarregar `/#connections` → banner aparece com "wpp2 desconectada".
2. Clicar **Reconectar** → request a `evolution-api` com `action: 'connect'` retorna `qrcode.base64`, status atualiza para `pending`, usuário é levado para a tela de conexões e o QR Code fica disponível ao clicar **Conectar** no card.
3. Inspecionar Network: deve haver chamada POST para `/functions/v1/evolution-api` (não `/evolution-api/instance/connect`).

### Arquivos afetados

- `src/components/alerts/EvolutionDisconnectBanner.tsx` (corrigir invocação + adicionar navegação para `/connections`)

