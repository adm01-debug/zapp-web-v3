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

## 2. Busca e Navegação
- [ ] **Abrir Busca (Ctrl+K):** O campo de busca deve aparecer com animação suave.
- [ ] **Highlight em Tempo Real:** Digitar um termo comum.
    - [ ] As mensagens no chat devem receber um fundo amarelo/destaque.
    - [ ] O contador deve mostrar `X/N`.
- [ ] **Navegação (↑/↓):** Usar as setas no teclado ou botões na barra de busca.
    - [ ] O chat deve dar scroll automático para a mensagem selecionada.
    - [ ] A mensagem focada deve ter um "anel" visual temporário.

## 3. Compositor e Anexos
- [ ] **Pré-visualização de Arquivos:** Arrastar uma imagem e um PDF para o chat.
    - [ ] Deve aparecer uma barra acima do input com as miniaturas.
    - [ ] Botão "X" em cada anexo deve removê-lo instantaneamente.
- [ ] **Status de Envio:** Enviar uma mensagem com anexo grande.
    - [ ] A barra de progresso azul deve aparecer e mostrar a porcentagem.
    - [ ] O input deve ficar desabilitado (cinza) durante o envio.

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
