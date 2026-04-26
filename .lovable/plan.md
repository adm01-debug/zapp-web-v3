## Objetivo
Eliminar o erro `Maximum update depth exceeded` que ainda ocorre na home/Chat, restaurando o carregamento normal da aplicação sem depender de limpeza de cache.

## O que será feito
1. Remover a composição problemática de triggers Radix no Chat
- Reestruturar os pontos onde `TooltipTrigger asChild` está envolvendo `DropdownMenuTrigger asChild` ou `PopoverTrigger asChild` no mesmo botão.
- Aplicar a correção primeiro no caminho crítico que monta em `/`:
  - `src/components/inbox/chat/ChatPanelHeader.tsx`
- Ajustar os outros pontos com o mesmo padrão para evitar recorrência:
  - `src/components/inbox/KeyboardShortcutsHelp.tsx`
  - `src/components/inbox/chat/AIEnhanceButton.tsx`
  - `src/components/team-chat/TeamChatHeader.tsx`

2. Tornar os alvos de tooltip/menu/popover estáveis
- Garantir que cada primitive tenha um alvo estável, sem dois `asChild` competindo pelo mesmo elemento.
- Usar uma destas abordagens conforme o componente:
  - mover o tooltip para um wrapper estático
  - deixar apenas o menu/popover como trigger do botão
  - remover tooltip redundante em ações já autoexplicativas

3. Validar o caminho crítico do Chat
- Confirmar que a rota `/` volta a montar a shell e o painel do chat sem cair no ErrorBoundary.
- Verificar que os botões “Mais ações”, ajuda/atalhos e popovers continuam funcionando após a refatoração.

## Resultado esperado
- A página inicial carrega normalmente.
- O Chat deixa de entrar em loop de renderização.
- Menus, popovers e tooltips continuam operando sem regressões visíveis.

## Detalhes técnicos
- O stack atual (`setRef` / `composeRefs`) é compatível com refs instáveis em primitives do Radix quando há `asChild` aninhado.
- O padrão problemático identificado é este:

```text
TooltipTrigger asChild
  -> DropdownMenuTrigger asChild
    -> Button
```

ou

```text
TooltipTrigger asChild
  -> PopoverTrigger asChild
    -> Button
```

- Em React atual, a troca contínua da identidade do ref pode disparar cleanup + reattach em cascata, gerando `Maximum update depth exceeded`.
- A correção será estrutural no JSX, não apenas um paliativo no hook de permissões.

## Arquivos previstos
- `src/components/inbox/chat/ChatPanelHeader.tsx`
- `src/components/inbox/KeyboardShortcutsHelp.tsx`
- `src/components/inbox/chat/AIEnhanceButton.tsx`
- `src/components/team-chat/TeamChatHeader.tsx`