# 🚨 Runbook de Incidentes — ZAPP WEB

## Severidades
- **S1 (Crítico)**: Sistema fora do ar, impossibilidade de enviar/receber mensagens.
- **S2 (Alto)**: Funcionalidade principal lenta ou instável (ex: delay > 10s no WhatsApp).
- **S3 (Médio)**: Bug em funcionalidade secundária (ex: relatório não gera).
- **S4 (Baixo)**: Bug cosmético ou dúvida.

## Cenários Comuns

### 1. WhatsApp não conecta / Mensagens não chegam
- **Verificação**: Checar `v_webhook_health` no banco.
- **Ação**: Reiniciar instância na Evolution API via Painel Admin.
- **Audit**: Ver logs da função `evolution-webhook`.

### 2. Erros de Autenticação (JWT)
- **Verificação**: Tentar login em aba anônima.
- **Ação**: Verificar se `LOVABLE_API_KEY` ou secrets de auth foram alterados.
- **Rollback**: Reverter última migration de auth se aplicável.

### 3. FATOR X Lento
- **Verificação**: Rodar `fn_zapp_web_smoke_test_v2()`.
- **Ação**: Verificar `pg_stat_activity` para queries travadas.
- **Escalação**: Contactar suporte do banco externo se latência persistir > 2s.

## Contatos de Emergência
- Infra: @dev-ops
- Backend: @senior-dev
- Stakeholder: @manager
