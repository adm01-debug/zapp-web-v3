

## Restaurar o sistema: corrigir ordem de `@import` no `src/index.css`

### Causa raiz
O build do Vite está falhando com `@import must precede all other statements` em **7 imports** porque o arquivo `src/index.css` foi modificado de forma incorreta numa correção anterior:

- Os `@import './styles/*.css'` estão nas linhas **65–71** (final do arquivo)
- Antes deles existem regras CSS reais: `:root` (linha 2), `html, body` (linha 8), `::view-transition` (linha 18), `@tailwind` (linha 32), `:focus-visible` (linha 38), media queries (linha 53)

A spec CSS exige que **todos os `@import` venham antes de qualquer outra regra** (exceto `@charset` e `@layer` vazios). Como o build CSS quebra, o preview fica em tela branca / fallback.

### Correção (1 arquivo, edit cirúrgico)

**`src/index.css`** — reorganizar para a ordem correta:

```text
1. @import './styles/tokens.css';        ← TOPO
2. @import './styles/base.css';
3. @import './styles/utilities.css';
4. @import './styles/components.css';
5. @import './styles/animations.css';
6. @import './styles/sidebar.css';
7. @import './styles/accessibility.css';
8. (linha em branco)
9. :root { --font-display, --font-sans }
10. html, body, #root { viewport lock }
11. ::view-transition-* + keyframes
12. @tailwind base; @tailwind components; @tailwind utilities;
13. :focus-visible / safe-area / mobile media query
```

Conteúdo é **idêntico** — só muda a ordem (imports sobem para o topo). Nada é deletado.

### Validação pós-correção
1. Dev-server log deve parar de emitir `[vite:css] @import must precede...`
2. Preview em `/` carrega tela de login estilizada (fontes Outfit + cores Corporate Blue)
3. Sem regressão visual: tokens, animations, sidebar continuam aplicados

### Riscos
Nenhum. Mudança puramente de ordem; CSS final compilado é equivalente, mas agora válido pelo parser.

### Fora do escopo
Os arquivos `src/styles/{base,tokens,components,utilities}.css` que receberam `@tailwind` na correção anterior **podem ficar como estão** — diretivas duplicadas são tratadas pelo Tailwind sem efeito colateral. Se quiser limpeza extra, faço numa segunda passada.

