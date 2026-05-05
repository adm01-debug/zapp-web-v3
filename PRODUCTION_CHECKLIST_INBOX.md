# Checklist de Produção - Módulo Inbox (V2)

## 1. Verificações de Estabilidade (Go-Live)
- [ ] **Fila de Mensagens:** Validar persistência no `localStorage` após encerramento do navegador.
- [ ] **Optimistic UI:** Testar reconciliação em conexões lentas (3G) garantindo que não há duplicidade de bolhas.
- [ ] **Mídias:** Verificar limites de upload para arquivos > 50MB e timeouts de processamento.
- [ ] **Audio Recorder:** Testar fallback de transcrição (Web Speech API vs Backend) em múltiplos navegadores (Chrome/Safari/Firefox).
- [ ] **Teclado:** Validar que Enter/Esc não quebram acessibilidade ou fecham modais errados.

## 2. Monitoramento e Observabilidade (Post-Deploy)
- [ ] **Sentry/Logging:** Verificar se logs `[QUEUE_ERROR]` e `Message Queue Failure` estão sendo capturados.
- [ ] **Alertas de Erro:** Configurar alerta para taxa de falha > 5% no envio de mensagens em 10 minutos.
- [ ] **Performance:** Medir tempo médio de upload de áudio (objetivo: < 3s para áudios de 1min).
- [ ] **Retentativas:** Validar se mensagens falhas estão sendo retentadas automaticamente via telemetria.

## 3. Plano de Rollout via Feature Flags
- [ ] **Canary (10%):** Habilitar `v2_audio_recorder` para um subconjunto de agentes e monitorar feedback.
- [ ] **Gradual (50%):** Expandir após 2h sem erros críticos detectados no Sentry.
- [ ] **Full (100%):** Ativar globalmente após 24h de estabilidade.
- [ ] **Kill-switch:** Em caso de erro catastrófico na fila, desligar `message_queue_retry` e `v2_audio_recorder` via painel Admin.

## 4. Testes de Regressão Críticos
- [ ] Enviar áudio -> Cancelar -> Desfazer -> Enviar.
- [ ] Editar mensagem enviada -> Verificar se bolha atualiza em tempo real para o contato.
- [ ] Modo Offline -> Enviar 3 mensagens -> Voltar Online -> Verificar ordem e entrega.

