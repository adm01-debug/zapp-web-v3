

## Plan: Unificar TODAS as Ferramentas no Padrão Modal (como o print de referência)

### Problema
- **Visão (AIConversationAssistant)** ainda usa o padrão antigo de **painel lateral** (`w-80`, slide-in da direita, sem backdrop)
- Os outros 3 tools (Objeções, Universitários, Resumo) já usam o `ToolPanel` com modal centralizado + backdrop
- O resultado é inconsistência visual — e o Visão não tem o efeito "primeiro plano + fundo translúcido"

### Solução
Migrar o **AIConversationAssistant (Visão)** para usar o `ToolPanel` wrapper, igual aos outros 3 tools. Assim todas as 4 ferramentas ficam idênticas ao print de referência: **modal centralizado com backdrop translúcido**.

### Alterações

**1. `src/components/inbox/AIConversationAssistant.tsx`**
- Remover o wrapper `AnimatePresence` + `motion.div` próprio (linhas 332-339) e o header interno (linhas 341-373)
- Exportar apenas o conteúdo interno (PeriodFilter, botão analisar, resultados, tabs)
- Aceitar prop `headerRight` para os botões extras (TTS/Ouvir) que ficam no header do ToolPanel

**2. `src/components/inbox/ChatPanel.tsx`**
- Envolver `AIConversationAssistant` no `ToolPanel` wrapper, igual Objeções/Universitários/Resumo
- Passar `icon={<VisionIcon>}`, `title="Visão"`, `subtitle="Análise Profunda"`, e `headerRight` com botão TTS

### Resultado
Todas as 4 ferramentas usam o mesmo componente `ToolPanel`:
- Modal centralizado (`max-w-lg`, `max-h-[85vh]`)
- Backdrop `bg-black/50 backdrop-blur-[2px]`
- Header padronizado (ícone + título + subtítulo + ações + X)
- ScrollArea no corpo
- Animação `scale 0.95→1` + `opacity`

### Arquivos Modificados
1. `src/components/inbox/AIConversationAssistant.tsx` — remover wrapper/header próprio
2. `src/components/inbox/ChatPanel.tsx` — envolver Visão no ToolPanel

