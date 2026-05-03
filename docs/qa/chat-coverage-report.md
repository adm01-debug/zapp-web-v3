# Relatório de Cobertura de Testes - Módulo CHAT

## 🟢 Cobertura Automatizada (Vitest / Playwright)
- **Busca:** 100% (Destaque, navegação, filtros de mídia).
- **Lógica de Input:** 90% (Menções, comandos /barra, limite de caracteres).
- **Performance de Scroll:** 80% (Paginador `loadOlder`, cancelamento de scroll).
- **Renderização de Mensagens:** 95% (Todos os tipos: áudio, vídeo, imagem, sticker).

## 🟡 Cobertura Manual (Checklist Requerido)
- **Gestão de Foco:** Retorno do foco após fechar modais em diferentes navegadores.
- **Micro-interações:** Animações do Framer Motion em redes lentas.
- **Gestão de Mídia Bloqueada:** Comportamento quando a Evolution API retorna 403 em imagens expiradas.
- **Integração com Periféricos:** Teste com microfones Bluetooth e fones de ouvido para gravação/TTS.

## 🔴 Gaps Identificados
- **Testes de Stress:** Simulação de >500 mensagens recebidas em menos de 10 segundos (condição de corrida no scroll).
- **Offline Mode:** Cache do Service Worker quando a conexão cai no meio de um upload.
