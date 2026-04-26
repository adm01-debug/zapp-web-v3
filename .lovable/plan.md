<final-text>## Correção definitiva do bug no Chat/Inbox

### Diagnóstico
O erro que ainda sobra não é mais o dos tooltips.

A falha atual está isolada neste caminho:

```text
ConversationListSidebar
  -> ContactTypeFilter
    -> src/components/ui/select.tsx
      -> @radix-ui/react-select (SelectTrigger / PopperAnchor / Collection)
```

O stack do runtime aponta diretamente para `ContactTypeFilter.tsx:160` e `src/components/ui/select.tsx:26`, com loop em `setRef -> composeRefs -> SelectTrigger -> PopperAnchor`.

Também revisei o código e o problema restante faz sentido estruturalmente:
- `ContactTypeFilter` usa `Select` com trigger totalmente customizado
- o trigger renderiza um `div` manual dentro de `SelectTrigger`, em vez de usar o fluxo mais estável com `SelectValue`
- as opções são renderizadas com wrapper extra (`<div key=...>`) envolvendo `SelectItem` + `SelectSeparator`
- o `Select` do Radix mantém refs/estado internos para trigger, âncora popper e coleção de itens; nessa tela isso está entrando em cascata e estourando o limite de updates do React

Pesquisei referências externas e elas batem com o sintoma: há issues recentes do Radix envolvendo `PopperAnchor`, `composeRefs` e `Maximum update depth exceeded` quando há refs/efeitos internos disparando updates repetidos em componentes de overlay.

### Do I know what the issue is?
Sim.

O problema real é o `Select` montado no sidebar do inbox, especialmente `ContactTypeFilter`, e não mais os tooltips removidos antes.

### Plano de implementação
1. **Remover o Radix Select do `ContactTypeFilter`** no carregamento inicial do sidebar e substituir por uma implementação estável para esse filtro compacto.
   - Preferência: botão + painel/lista controlado localmente, sem `Select`, sem `PopperAnchor`, sem registro de coleção do Radix Select.
   - Manter label ativo, ícone, contagens e acessibilidade.

2. **Eliminar padrões de markup instáveis ligados ao filtro**.
   - Remover wrappers extras ao redor das opções.
   - Garantir que cada item clicável seja um único nó estável.
   - Preservar `aria-label`, foco e navegação por teclado.

3. **Auditar os outros `Select`s do inbox que usam trigger customizado** para evitar recaída do mesmo padrão.
   - `src/components/inbox/FailureCategoryFilter.tsx`
   - `src/components/inbox/ConversationHistory.tsx`
   - qualquer outro `SelectTrigger` com `div/span` custom dentro do trigger

4. **Só usar atualização de dependência como complemento, não como solução principal**.
   - Verificar se existe patch seguro para o conjunto Radix relacionado a `Select/Popper/compose-refs`
   - aplicar apenas se fizer sentido, mas sem depender disso para o bug parar

5. **Validação real no preview**.
   - abrir `/`
   - confirmar que o sidebar monta sem cair no `ErrorBoundary`
   - abrir/trocar o filtro de tipo de contato várias vezes
   - testar também o estado com retry/falha ativo
   - confirmar ausência de novo `Maximum update depth exceeded` em runtime/console

### Arquivos principais
- `src/components/inbox/ContactTypeFilter.tsx`
- `src/components/inbox/ConversationListSidebar.tsx`
- `src/components/ui/select.tsx` (apenas se necessário para endurecer o wrapper compartilhado)
- `src/components/inbox/FailureCategoryFilter.tsx`
- `src/components/inbox/ConversationHistory.tsx`

### Detalhes técnicos
- Não vou atacar isso “no escuro” com mais remoções aleatórias.
- A correção vai focar no ponto exato que continua no stack atual: o filtro de tipo de contato do sidebar.
- O objetivo é tirar o inbox da dependência do caminho instável `SelectTrigger -> PopperAnchor -> ref/effect updates` já na montagem inicial.

<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>
<lov-actions>
<lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions></final-text>