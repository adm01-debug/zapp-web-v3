# Arquitetura FATOR X — Resumo para Frontend

> Doc completa: FATOR-X-DATABASE-ARCHITECTURE.md

## BD Stats
- **3.9 GB** total · **273 tabelas** · **1.8M mensagens** · **12.7K contatos** · **1.7K conversas**
- PostgreSQL 15.8 self-hosted · Particionado por `instance_name`
- **55 Edge Functions** no cloud FATOR X

## Tabelas Core (com dados)
| Tabela | Linhas | Tamanho |
|---|---|---|
| `evolution_messages_wpp2` | 1.839.539 | 3.577 MB |
| `evolution_webhook_events_wpp2` | 20.670 | 132 MB |
| `evolution_contacts` | 12.747 | 11 MB |
| `evolution_conversations_wpp2` | 1.687 | 1.3 MB |

## Módulos
- **Core WhatsApp**: messages, contacts, conversations, labels, groups
- **CRM/Pipeline**: deals, tasks, sales_pipeline, followups (schema pronto, sem dados)
- **BPM/Kanban**: 30+ tabelas (Pipefy clone, vazio)
- **AI Agents**: agents, knowledge_bases, RAG (vazio)
- **Multi-tenant**: tenants, workspaces, roles

## Particionamento
```
evolution_messages (parent)
├── wpp2 (PRODUÇÃO)
├── wpp_pink_test
├── vendedor_01..07
├── financeiro, compras, logistica, sac, diretoria, marketing
└── default
```

## Integração Frontend
1. Frontend usa `externalSupabase` client para queries
2. Edge Functions para envio e ações
3. Supabase Realtime para updates em tempo real
4. RLS precisa ser configurado por `auth.uid()`
