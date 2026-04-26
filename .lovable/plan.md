## Objetivo
Eliminar de forma definitiva o erro `Maximum update depth exceeded` na home (`/`) e validar que o Chat volta a montar sem cair no `ErrorBoundary`.

## Problema identificado
O erro atual não está mais apontando para permissões de rota. O stack mais recente cai em:
- `ConversationListSidebar.tsx`
- `@radix-ui/react-tooltip`
- `setRef / composeRefs`

Há dois padrões perigosos ainda ativos no caminho montado do Inbox:

1. Tooltips usando `asChild` em elementos inline/instáveis (`span`) no sidebar
- `src/components/inbox/ConversationListSidebar.tsx`
- `src/components/inbox/RealtimeContactsIndicator.tsx`

2. Composição aninhada de primitives Radix no input do chat
```text
TooltipTrigger asChild
  -> PopoverTrigger asChild
    -> Button
```
Arquivos confirmados com esse padrão:
- `src/components/inbox/TextToAudioButton.tsx`
- `src/components/inbox/StickerPicker.tsx`
- `src/components/inbox/VoiceChangerPicker.tsx`
- `src/components/inbox/CustomEmojiPicker.tsx`
- `src/components/inbox/AudioMemePicker.tsx`
- `src/components/inbox/chat/AIRewriteButton.tsx`

Esse padrão é compatível com o loop de refs do Radix/Slot (`setRef`, `composeRefs`) que dispara re-render em cascata.

## O que vou implementar
### 1. Estabilizar os tooltips do sidebar
- Remover `TooltipTrigger asChild` em `span` puros no sidebar.
- Trocar por uma estrutura estável, por exemplo:
  - wrapper fixo com `span/div` externo como trigger, ou
  - remoção do tooltip quando o elemento já tem `aria-label/title` suficiente.
- Aplicar isso em:
  - `src/components/inbox/ConversationListSidebar.tsx`
  - `src/components/inbox/RealtimeContactsIndicator.tsx`

### 2. Desacoplar Tooltip de Popover nos controles do Chat
- Reestruturar cada botão para que apenas um primitive controle o elemento clicável.
- Preferência de correção:
  - manter `PopoverTrigger asChild` no botão real
  - mover tooltip para `title`/`aria-label` quando o botão for autoexplicativo
  - ou envolver o botão/popover em wrapper estático, sem dois `asChild` competindo pelo mesmo nó
- Aplicar nos componentes já confirmados:
  - `src/components/inbox/TextToAudioButton.tsx`
  - `src/components/inbox/StickerPicker.tsx`
  - `src/components/inbox/VoiceChangerPicker.tsx`
  - `src/components/inbox/CustomEmojiPicker.tsx`
  - `src/components/inbox/AudioMemePicker.tsx`
  - `src/components/inbox/chat/AIRewriteButton.tsx`

### 3. Revisar o caminho crítico do Inbox após a refatoração
- Verificar se o sidebar continua funcional:
  - indicador online/offline
  - atualizar
  - nova conversa
  - filtro de retry/falha
- Verificar se os popovers do input continuam abrindo normalmente:
  - emojis
  - figurinhas
  - áudio meme
  - TTS
  - voice changer
  - IA rewrite

### 4. Validar de verdade na preview
Depois da implementação, vou testar o preview até confirmar:
- a rota `/` monta o Inbox sem `Maximum update depth exceeded`
- o `ErrorBoundary` do Chat não aparece
- os botões do sidebar e os popovers principais continuam utilizáveis
- se ainda houver erro, sigo para a próxima ocorrência real do stack antes de encerrar

## Resultado esperado
- A home volta a abrir normalmente.
- O loop infinito de renderização deixa de ocorrer.
- Os controles do Inbox/Chat continuam funcionando sem regressão visível.

## Detalhes técnicos
- O projeto usa React 18.3.1 e Radix Slot 1.2.3 / Tooltip 1.2.7.
- Mesmo sem React 19, a combinação atual de `TooltipTrigger asChild` com `PopoverTrigger asChild` e refs compostas continua sendo um ponto de instabilidade.
- A correção será estrutural no JSX, não um paliativo em hooks.
- Não vou mexer no cliente gerado do backend nem em permissões de rota para este bug, porque o stack atual não aponta mais para essa área.

## Validação prevista
- Inspecionar console/runtime após a mudança
- Abrir a rota `/` na preview
- Confirmar visualmente que o Chat carrega
- Exercitar ao menos os controles críticos do sidebar e do input do chat