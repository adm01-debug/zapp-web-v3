## Diagnóstico confirmado

O problema real agora é: a rota autenticada `/` ainda monta um conjunto grande de componentes Radix com `TooltipTrigger asChild` e `PopoverTrigger asChild` no shell principal, antes mesmo do inbox terminar de renderizar.

Do I know what the issue is? Yes.

Os indícios já confirmados:
- O bug anterior dos filtros do inbox foi só uma parte do problema.
- Ainda existem muitos gatilhos Radix montados no desktop shell: `Sidebar.tsx`, `SidebarNavItem.tsx`, `SidebarNavGroup.tsx`, `AppShell.tsx`, `AgentProfilePopover.tsx`, `PushNotificationToggle.tsx`, `ScreenProtectionToggle.tsx`, `SoundMuteToggle.tsx`.
- A pesquisa externa bate com o padrão documentado pela Radix: muitas instâncias `Tooltip/Popover` + `asChild` + refs compostos/Popper podem disparar loops de montagem e tela quebrada.
- O console também mostra avisos de refs em componentes de topo (`src/components/ui/sonner.tsx` e wrappers do app), então a montagem global precisa ser estabilizada, não só o inbox.

## Plano de correção

1. **Blindar o shell autenticado**
   - Remover `TooltipTrigger asChild` dos elementos montados sempre no shell desktop.
   - Substituir por `title`, `aria-label` e, onde necessário, wrappers estáveis sem composição de refs.
   - Arquivos principais:
     - `src/components/layout/Sidebar.tsx`
     - `src/components/layout/SidebarNavItem.tsx`
     - `src/components/layout/SidebarNavGroup.tsx`
     - `src/components/layout/AppShell.tsx`
     - `src/components/layout/AgentProfilePopover.tsx`

2. **Estabilizar toggles e controles globais**
   - Remover o padrão Radix instável dos controles rápidos e do FAB/ações globais.
   - Arquivos:
     - `src/components/notifications/PushNotificationToggle.tsx`
     - `src/components/notifications/ScreenProtectionToggle.tsx`
     - `src/components/notifications/SoundMuteToggle.tsx`
     - revisar qualquer uso indireto via `src/components/ui/icon-button.tsx` se estiver presente no shell inicial.

3. **Corrigir a camada global de toast/refs**
   - Ajustar o wrapper de Sonner para evitar warnings de ref em componentes raiz.
   - Confirmar se basta transformar o wrapper em `forwardRef`/repasse explícito ou simplificar a montagem para não receber `ref` indevido.
   - Arquivos:
     - `src/components/ui/sonner.tsx`
     - revisão rápida em `src/components/ui/toaster.tsx` e `src/components/ui/accessible-toast.tsx`

4. **Fazer um segundo passe só no que monta em `/`**
   - Auditar os componentes realmente carregados no boot autenticado e eliminar qualquer `Tooltip/Popover asChild` restante nessa árvore.
   - Prioridade no que aparece antes de abrir conversa/chat.

5. **Validar de verdade**
   - Testar a rota `/` autenticada até o shell aparecer corretamente.
   - Confirmar que sidebar, header e controles carregam sem tela preta.
   - Verificar console para ausência de `Maximum update depth exceeded` e para remoção/redução dos warnings de refs ligados ao boot.
   - Repetir com hard reload para garantir que não era cache.

## Validação esperada

Depois da implementação aprovada, vou validar estes critérios:
- a rota `/` abre sem tela preta;
- o shell autenticado renderiza inteiro;
- o inbox consegue montar sem cair em loop de atualização;
- os controles do layout continuam funcionando;
- o console não mostra mais o ciclo de refs/trigger como causa de quebra.

## Detalhes técnicos

Padrão que será evitado no boot:

```text
Tooltip/Popover Root
  -> Trigger asChild
    -> button/span/componente customizado
      -> composeRefs / PopperAnchor / Slot
        -> state update durante mount
          -> novo render
            -> novo ref
              -> loop / tela quebrada
```

Estratégia prática:
- reduzir Radix interativo na árvore inicial;
- manter acessibilidade com `aria-label` e `title` quando tooltip não for essencial;
- usar wrappers estáveis apenas onde tooltip/popover for indispensável;
- corrigir wrappers que hoje podem estar recebendo `ref` sem `forwardRef`.