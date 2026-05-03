# Roteiro de Teste Manual - Módulo CHAT (ZAPP Web)

Este guia serve para validação humana da experiência de usuário (UX) e interface (UI).

## 1. Interface e Densidade (Layout)
- [ ] **Alternar Densidade:** Clicar no ícone de grade no cabeçalho.
    - [ ] **Confortável:** Espaçamento generoso, bolhas grandes.
    - [ ] **Compacto:** Espaçamento reduzido, bolhas menores.
    - [ ] **Denso:** Sem avatares, mensagens coladas (máxima produtividade).
- [ ] **Responsividade:** Reduzir a largura da janela.
    - [ ] O menu lateral deve colapsar ou virar um "hambúrguer".
    - [ ] O dashboard de saúde no header deve ocultar detalhes mantendo apenas o ícone de status.

## 2. Busca e Navegação Avançada
- [ ] **Filtros de Mídia:** Abrir a busca e clicar nos chips de filtro.
    - [ ] **Imagens:** Deve mostrar apenas fotos.
    - [ ] **Áudios:** Deve mostrar apenas PTTs.
    - [ ] **Links:** Deve filtrar mensagens que contenham URLs.
- [ ] **Navegação por Data:** Usar o calendário na busca para filtrar um dia específico.
- [ ] **Busca com Destaque (Ctrl+F):** Garantir que o termo buscado está com `mark` (highlight) dentro da bolha.
- [ ] **Navegação (↑/↓):** Usar as setas no teclado ou botões na barra de busca.
    - [ ] O chat deve dar scroll automático para a mensagem selecionada.
    - [ ] A mensagem focada deve ter um "anel" visual temporário.

## 3. Compositor e Mídia
- [ ] **Áudio (PTT):** Gravar um áudio de 5 segundos.
    - [ ] Cancelar (ícone lixeira): O áudio deve sumir sem enviar.
    - [ ] Ouvir antes de enviar: No modo pré-envio, deve ser possível reproduzir.
- [ ] **Stickers e Memes:** Abrir o seletor de figurinhas (Ctrl+Shift+S).
    - [ ] Clicar em uma figurinha: Deve enviar instantaneamente.
    - [ ] Busca de stickers: O teclado deve filtrar a grade em tempo real.
- [ ] **Falha e Retry:** Simular falha (via simulação de rede ou debug).
    - [ ] O banner vermelho deve aparecer no topo da conversa.
    - [ ] O botão "Reenviar" deve disparar a mesma mensagem com os mesmos anexos.
- [ ] **Status de Envio:** Enviar uma mensagem com anexo grande.
    - [ ] A barra de progresso azul deve aparecer e mostrar a porcentagem.
    - [ ] O input deve ficar desabilitado (cinza) durante o envio.
- [ ] **Mensagens Interativas:** Enviar um botão de resposta ou lista via template/comando.
    - [ ] Verificar se os botões são clicáveis e geram a resposta correta no chat.

## 4. Modo Sussurro (Privacidade)
- [ ] **Ativar Sussurro:** Clicar em "Sussurro" no rodapé.
    - [ ] O fundo do input deve mudar para um tom amarelado/âmbar.
    - [ ] Deve aparecer o texto "Sussurro Interno".
- [ ] **Envio:** Enviar um sussurro.
    - [ ] A bolha no chat deve ter borda tracejada e etiqueta "Sussurro".
    - [ ] Validar que NÃO aparece o ícone de check (pois não vai para o WhatsApp).

## 5. Dashboard de Saúde (SLA)
- [ ] **Hover no Header:** Passar o mouse sobre o selo "Excelente/Bom/Crítico".
    - [ ] O Tooltip deve abrir com os 3 gráficos: Tempo de Resposta, Mensagens/Min e Taxa de Falha.
