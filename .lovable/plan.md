

## Bug: Galeria de Mídia abre como modal travado ao selecionar contato

### Causa raiz

Em `src/components/inbox/contact-details/ContactAccordionSections.tsx` (linha 130), a seção "Mídia Compartilhada" do accordion renderiza:

```tsx
<MediaGallery contactId={contact.id} open={true} onOpenChange={() => {}} />
```

Mas `MediaGallery` é um **Dialog modal full-screen** (`<Dialog><DialogContent class="max-w-4xl max-h-[90vh]">`), não um painel inline. Resultado:
- `open={true}` hardcoded → o modal abre toda vez que o painel `ContactDetails` monta (ou seja, ao abrir qualquer chat).
- `onOpenChange={() => {}}` no-op → clicar no X ou no overlay não fecha.
- O accordion "Mídia Compartilhada" nunca chega a expandir porque o conteúdo é um Dialog que se desacopla do DOM via portal.

### Correção

**Opção escolhida:** transformar a seção "Mídia Compartilhada" do accordion em um **botão que abre o Dialog sob demanda**, mantendo o componente `MediaGallery` como modal (que é seu design original e é usado em outros lugares).

Mudanças em `ContactAccordionSections.tsx`:

1. Adicionar estado local `const [mediaOpen, setMediaOpen] = useState(false)`.
2. Substituir o conteúdo do `AccordionItem value="media"` por um botão "Abrir galeria" dentro do `AccordionContent` que faz `setMediaOpen(true)`. Mostrar contador de itens se já carregado (opcional — pode ficar simples primeiro).
3. Renderizar `<MediaGallery contactId={contact.id} open={mediaOpen} onOpenChange={setMediaOpen} />` **fora** do `AccordionItem`, no final do fragment retornado.

### Arquivos editados

- `src/components/inbox/contact-details/ContactAccordionSections.tsx` (única alteração necessária)

### Fora de escopo

- Não mexo em `MediaGallery.tsx` (continua sendo modal — é usado corretamente em outros lugares se houver).
- Erro 504 do `external-db-proxy` no log é de outro fluxo e não relacionado a este bug.

