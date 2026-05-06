# ADR-007: Audit & Recovery Model (Implementation)

## Status
Implementado (Onda 3)

## Contexto
Necessidade de garantir a integridade dos dados e a capacidade de recuperação de falhas em fluxos de mensagens e webhooks.

## Decisões
1. **Sequence Numbering**: Coluna `sequence_number` BIGSERIAL em `messages` para ordenação determinística.
2. **Reprocess Queue**: Tabela `reprocess_jobs` para gerenciar retentativas de falhas de processamento.
3. **Outbox Pattern**: Tabela `evolution_outbox` para garantir que eventos de domínio sejam persistidos atomicamente com a mudança de estado.
4. **Optimistic Locking**: Coluna `version` em `profiles` para prevenir condições de corrida em edições de perfil/contato.

## Consequências
- Maior confiabilidade na ordem das mensagens.
- Visibilidade administrativa sobre falhas de integração.
- Proteção contra perda de dados em atualizações concorrentes.
