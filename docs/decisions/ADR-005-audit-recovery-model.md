# ADR-005: Audit & Recovery Model (FATOR X)

## Status
Proposto (Onda 2)

## Contexto
O sistema FATOR X lida com fluxos críticos de WhatsApp e CRM. Falhas na sincronização ou deleções acidentais precisam de um rastro de auditoria robusto e mecanismos de recuperação.

## Decisões
1. **Immutable Logs**: Toda mensagem recebida é logada em `provider_message_log` antes de qualquer processamento.
2. **Audit Tables**: `evolution_audit_log` registra todas as mudanças de estado e deleções, capturando o estado `old_data` e `new_data`.
3. **Reprocess Jobs**: Tabela `reprocess_jobs` para gerenciar tentativas de recuperação de mensagens que falharam no processamento inicial.
4. **Sequence Numbers**: Adição de `sequence_number` em `evolution_messages` para garantir ordem cronológica absoluta e detectar gaps.

## Consequências
- Aumento do uso de armazenamento para logs.
- Maior facilidade em debug de problemas de concorrência.
- Capacidade de "replay" de eventos em caso de desastre.
