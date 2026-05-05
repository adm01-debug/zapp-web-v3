# Checklist de Produção - Módulo Inbox

## 1. Verificações de Estabilidade (Go-Live)
- [ ] **Fila de Mensagens:** Validar persistência no `localStorage` após encerramento do navegador.
- [ ] **Optimistic UI:** Testar reconciliação em conexões lentas (3G) garantindo que não há duplicidade de bolhas.
- [ ] **Mídias:** Verificar limites de upload para arquivos > 50MB e timeouts de processamento.
- [ ] **Audio Recorder:** Testar fallback de transcrição (Web Speech API vs Backend) em múltiplos navegadores (Chrome/Safari/Firefox).

## 2. Monitoramento e Observabilidade
- [ ] **Logging:** Verificar se logs estruturados `[QUEUE_ERROR]` estão chegando no coletor (Sentry/LogSnag).
- [ ] **Alertas:** Configurar trigger de alerta para taxa de erro de fila > 5% em 10 minutos.
- [ ] **Tracking:** Validar eventos `Message Queue Failure` no dashboard de analytics.

## 3. Plano de Rollout (Canary/Feature Flags)
- [ ] Ativar `v2-audio-recorder` para 10% da base de usuários inicialmente.
- [ ] Monitorar telemetria de erro por 4 horas antes da expansão total.
- [ ] Botão de "Kill-switch" preparado para reverter para a UI legada caso a fila de mensagens apresente deadlock.

## 4. Performance (Stress Test)
- [ ] Validar throughput de 100 mensagens/segundo por instância.
- [ ] Medir latência média de processamento da fila (alvo: < 500ms para texto).
