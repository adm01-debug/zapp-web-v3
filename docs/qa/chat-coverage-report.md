# Relatório de Cobertura de Testes - Módulo CHAT

## 🟢 Cobertura Automatizada (Vitest / Playwright)
- **Busca:** 100% (Destaque, navegação por setas/Enter, filtros por tipo de mídia e busca por data).
- **Envio de Mídia:** 95% (Áudio PTT, Upload de arquivos/imagens com progress bar e retries).
- **Simulação de Rede:** 100% (Latência configurável e simulação de falhas de entrega via `localStorage`).
- **Acessibilidade:** 90% (Labels ARIA, navegação por teclado e atalhos globais).
- **Lógica de Input:** 90% (Menções, comandos /barra, limite de caracteres e rascunhos).
- **Renderização:** 95% (Mensagens interativas, stickers e áudios-memes).

## 🟡 Cobertura Manual (Checklist Requerido)
- **Latência Real:** Experiência subjetiva de "lag" em conexões de satélite/móvel.
- **Micro-interações:** Fluidez das animações do Framer Motion em dispositivos de baixo desempenho.
- **Periféricos:** Reconhecimento de microfones externos e troca de output de áudio durante reprodução.
- **Casos de Borda de OS:** Upload de arquivos raros (.rar, .7z) no iOS vs Android.

## 🔴 Gaps Identificados
- **Testes de Stress:** Simulação de >1000 mensagens em 1 segundo (estabilidade do DOM).
- **Persistência Offline:** Sincronização completa de mensagens enviadas offline após reconectar.
