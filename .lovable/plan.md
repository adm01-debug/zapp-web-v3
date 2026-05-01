## Problema

O banner vermelho gigante fixo no topo (`EvolutionDisconnectBanner`) ocupa toda a largura da tela, empurra o conteúdo para baixo e tem visual agressivo (`bg-destructive`, animação de pulse, ícone grande). Aparece sempre que `whatsapp_connections.status = 'disconnected'`.

Já existe um componente discreto e elegante para o mesmo dado: `WhatsAppConnectionStatus` (badge pequeno verde/vermelho com contagem `connected/total`), atualmente usado dentro da `ConversationListSidebar` do Inbox.

## Solução

Trocar o banner intrusivo por um **chip discreto no header global**, com Popover de detalhes e ação de reconectar — mantendo a informação acessível sem ser irritante.

### 1. Remover o banner fixo

- Em `src/components/layout/IndexContentConnected.tsx`:
  - Remover o import e a renderização de `<EvolutionDisconnectBanner />` (linhas 20 e 96).
- Marcar `src/components/alerts/EvolutionDisconnectBanner.tsx` como deprecated (manter o arquivo por enquanto, sem uso) ou deletar — preferência: **deletar** para evitar regressão.

### 2. Criar indicador compacto no header

Novo componente `src/components/layout/ConnectionStatusIndicator.tsx`:

- Reaproveita a lógica de `EvolutionDisconnectBanner` (query + realtime em `whatsapp_connections`) e a ação `handleReconnect` (com cooldown de 30s e tratamento `EVOLUTION_AUTH_ERROR`).
- Renderização:
  - **Tudo OK** → ícone `Wifi` pequeno em `text-emerald-500`, sem destaque (ou nada — opcional).
  - **1+ desconectada** → botão chip pequeno (`h-7 px-2`) com ícone `WifiOff` âmbar/vermelho sutil + texto curto "wpp2 offline" (ou "2 offline").
  - Clique abre `Popover` (shadcn) listando as instâncias desconectadas com botão "Reconectar" individual + cooldown.
- Sem `position: fixed`, sem `motion` de slide, sem ocupar largura inteira. Cores semânticas (`text-destructive`, `bg-destructive/10`), nada de `bg-destructive` chapado.
- Acessibilidade: `aria-label`, foco visível, `role="status"` com `aria-live="polite"` para mudanças de estado.

### 3. Posicionar o indicador no header

- Adicionar `<ConnectionStatusIndicator />` no header global (provavelmente `AppShell` / `AppHeader` — confirmar arquivo durante implementação) ao lado dos demais ícones de status (notificações, sirene, etc.).
- Manter `WhatsAppConnectionStatus` na sidebar do Inbox como está (já é discreto e contextual).

### 4. Notificação inicial (opcional, recomendado)

- Quando uma instância transiciona de `connected` → `disconnected`, disparar **um único toast** (sonner, variant `warning`, duração 6s) com botão "Reconectar". Não repetir enquanto o usuário não dispensar; deduplicar por `instance_id`.
- Isso preserva o "alerta ativo" sem precisar do banner permanente.

## Detalhes técnicos

- **Cores**: usar tokens semânticos (`text-destructive`, `bg-destructive/10`, `border-destructive/30`) — nunca hardcoded. Para estado "atenção" preferir âmbar (`text-amber-500`) ao vermelho puro.
- **Tamanho**: chip `h-7`, ícone `w-3.5 h-3.5`, texto `text-xs`. Touch target mínimo 44px garantido via `min-h-11` no wrapper invisível ou padding.
- **Realtime**: manter o canal Supabase (`whatsapp_connections` UPDATE) já existente; reutilizar lógica.
- **Logger**: continuar usando `getLogger('EvolutionBanner')` → renomear para `'ConnectionStatusIndicator'`.
- **Memory**: alinhado com `mem://style/design-system-and-skins` (sem cores hardcoded) e `mem://features/sidebar/quick-access-controls`.

## Arquivos afetados

- ✏️ `src/components/layout/IndexContentConnected.tsx` — remover banner.
- 🗑️ `src/components/alerts/EvolutionDisconnectBanner.tsx` — deletar.
- ➕ `src/components/layout/ConnectionStatusIndicator.tsx` — novo chip + popover.
- ✏️ `AppShell` / header global — montar o novo indicador (arquivo confirmado na implementação).

## Resultado esperado

```text
Antes: [================ BANNER VERMELHO FULL WIDTH ================]
Depois: [ ZAPP Web ............... 🔔  📞  ⚠ wpp2 offline  👤 ]
                                          └─ click → popover c/ Reconectar
```
