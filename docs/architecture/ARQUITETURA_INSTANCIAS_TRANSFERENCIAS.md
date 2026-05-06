# Arquitetura Multi-Instância WhatsApp + Sistema de Transferências

> **Produto:** Zap Webb — CRM WhatsApp (Promo Brindes)
> **Versão:** 2.0 — 05/05/2026
> **Ambiente:** VPS self-hosted, Docker Swarm, PG 14, Supabase

---

## 1. Visão geral

O Zap Webb opera com **23 instâncias WhatsApp** em 3 categorias:

| Categoria | Qtd | Tipo | Descrição |
|-----------|-----|------|-----------|
| Comercial | 15 | individual | 1 vendedor por cadeira, carteira própria |
| Departamento | 6 | shared | Vários colaboradores no mesmo número |
| Sistema | 2 | shared | Produção (wpp2) + testes (wpp_pink_test) |

Cada instância possui partições exclusivas de banco, triggers próprios e indexes otimizados. O frontend recebe todas as atualizações via Realtime com `pubviaroot=true`.

---

## 2. Conceito fundamental: cadeira fixa + operador rotativo

A ideia central é que a instância funciona como um e-mail da empresa: `comercial03@promobrindes.com.br`.

- **Cadeira (slot_name):** Nome fixo que nunca muda → "Comercial 03"
- **Operador (operator_name):** Pessoa que senta na cadeira → mutável
- **Carteira:** Pertence à cadeira, não à pessoa
- **Histórico:** Permanece quando o vendedor sai

### Para trocar o vendedor de uma cadeira

```sql
UPDATE instance_registry SET
  operator_name  = 'Amanda Oliveira',
  operator_email = 'amanda@promobrindes.com.br',
  operator_since = now()
WHERE instance_name = 'comercial_03';
-- Cadeira permanece. Carteira permanece. Histórico permanece.
```

---

## 3. Mapa completo de instâncias

### 3.1 — Comercial (15 cadeiras individuais)

| # | instance_name | Cadeira (fixa) | Operador (mutável) | Chip WhatsApp |
|---|---------------|---------------|-------------------|--------------|
| 1 | `comercial_01` | Comercial 01 | _a definir_ | _a definir_ |
| 2 | `comercial_02` | Comercial 02 | _a definir_ | _a definir_ |
| 3 | `comercial_03` | Comercial 03 | _a definir_ | _a definir_ |
| 4 | `comercial_04` | Comercial 04 | _a definir_ | _a definir_ |
| 5 | `comercial_05` | Comercial 05 | _a definir_ | _a definir_ |
| 6 | `comercial_06` | Comercial 06 | _a definir_ | _a definir_ |
| 7 | `comercial_07` | Comercial 07 | _a definir_ | _a definir_ |
| 8 | `comercial_08` | Comercial 08 | _a definir_ | _a definir_ |
| 9 | `comercial_09` | Comercial 09 | _a definir_ | _a definir_ |
| 10 | `comercial_10` | Comercial 10 | _a definir_ | _a definir_ |
| 11 | `comercial_11` | Comercial 11 | _a definir_ | _a definir_ |
| 12 | `comercial_12` | Comercial 12 | _a definir_ | _a definir_ |
| 13 | `comercial_13` | Comercial 13 | _a definir_ | _a definir_ |
| 14 | `comercial_14` | Comercial 14 | _a definir_ | _a definir_ |
| 15 | `comercial_15` | Comercial 15 | _a definir_ | _a definir_ |

### 3.2 — Departamentos (6 instâncias compartilhadas)

| instance_name | Nome | Tipo | Uso principal |
|---------------|------|------|--------------|
| `financeiro` | Financeiro | shared | Cobrança, pagamentos, NFs, boletos |
| `compras` | Compras | shared | Fornecedores, orçamentos, pedidos de compra |
| `logistica` | Logística | shared | Expedição, rastreio, transportadoras |
| `artes` | Artes | shared | Criação de artes, aprovação de layouts |
| `gravacao` | Gravação | shared | Gravação/personalização de produtos |
| `marketing` | Marketing | shared | Campanhas, leads, redes sociais |

### 3.3 — Sistema

| instance_name | Nome | Uso |
|---------------|------|-----|
| `wpp2` | Promo Brindes Principal | Produção (1.8M msgs, legado) |
| `wpp_pink_test` | Pink Test | Testes e desenvolvimento |

---

## 4. Contatos compartilhados entre instâncias

A tabela `evolution_contacts` é **global** (não particionada). Um contato que fala com 3 instâncias diferentes tem:

- **1 registro** em `evolution_contacts` (1 contact_id)
- **3 registros** em `evolution_conversations` (1 por instância)
- **N registros** em `evolution_messages` (nas partições de cada instância)
- **unread_count independente** por instância

```
Fornecedor Gráfica Express (contact_id = abc123)
├── compras    → conversation A (unread=1, last: "Orçamento aprovado")
├── financeiro → conversation B (unread=2, last: "Pagamento agendado 29/05")
└── logistica  → conversation C (unread=0, last: "Rastreio BR789 anotado")
```

O `push_name` **não é sobrescrito** por mensagens enviadas (`from_me=true`).

---

## 5. Infraestrutura de banco por instância

Cada instância gera automaticamente:

| Recurso | Quantidade | Descrição |
|---------|-----------|-----------|
| Partições | 3 | messages + conversations + webhook_events |
| Triggers | 3 | enqueue_media + rewrite_url + auto_media |
| Indexes herdados | 10 | PK, UNIQUE, JID, contact, status, FTS (GIN) |
| Partial index | 1 | media_meta (mídia pendente de download) |
| Realtime | automático | pubviaroot=true publica via tabela pai |

### Totais consolidados

| Recurso | Valor |
|---------|-------|
| Instâncias no registry | **23** |
| Partições por tabela | 24 (23 inst + default) |
| Total de partições | **72** (24 × 3 tabelas) |
| Triggers em messages | **73** |
| Partial indexes media_meta | **23** |
| Performance | **1.1ms/msg** (21 instâncias simultâneas) |

---

## 6. Tabela `instance_registry` (28 colunas)

Cadastro central de todas as instâncias.

**Identificação:**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | Auto-gerado |
| `instance_name` | varchar UNIQUE | Identificador técnico: `comercial_01`, `financeiro` |
| `display_name` | varchar | Nome exibido no frontend |
| `slot_name` | varchar | Nome fixo da cadeira (nunca muda) |
| `department` | varchar | comercial, financeiro, compras, logistica, artes, gravacao, marketing, ti |
| `usage_type` | varchar | `individual` ou `shared` |

**Operador (mutável):**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `operator_name` | varchar | Nome da pessoa atual |
| `operator_email` | varchar | E-mail pessoal |
| `operator_since` | timestamptz | Quando assumiu a cadeira |
| `operator_phone` | varchar | Telefone pessoal (diferente do chip) |

**WhatsApp:**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `phone_number` | varchar | Chip WhatsApp vinculado |
| `is_active` | boolean | Instância ativa |
| `webhook_url` | text | URL do webhook |
| `webhook_enabled` | boolean | Webhook ligado |

**Configurações:**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `max_concurrent_chats` | int | Máximo de chats simultâneos (default 50) |
| `sla_first_response_minutes` | int | SLA 1ª resposta (default 30 min) |
| `sla_resolution_hours` | int | SLA resolução (default 24h) |
| `auto_reply_enabled` | boolean | Resposta automática fora do horário |
| `auto_reply_message` | text | Texto da resposta automática |
| `business_hours_enabled` | boolean | Horário comercial ativo |
| `bitrix_integration` | jsonb | Config de integração Bitrix24 |
| `n8n_workflows` | jsonb | Workflows n8n associados |
| `config` | jsonb | Configurações extras |
| `notes` | text | Observações livres |

---

## 7. Sistema de transferências entre instâncias

### 7.1 — O problema

O cliente fala com o vendedor pedindo algo que outro departamento precisa resolver. O vendedor não pode resolver sozinho, mas o cliente não deve precisar ligar para outro número.

### 7.2 — Dois tipos de transferência

| Tipo | Frequência | O que acontece | Exemplo |
|------|-----------|---------------|---------|
| **internal** | ~90% | Cliente nem percebe. Vendedor cria ticket, depto resolve internamente, vendedor responde ao cliente. | "Me manda a NF" → Financeiro gera → vendedor envia |
| **direct** | ~10% | Departamento contata cliente do próprio número. | Financeiro negocia pagamento atrasado direto |

### 7.3 — Tabela `conversation_transfers` (27 colunas)

**Origem (quem transferiu):**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `source_instance` | text NOT NULL | Instância de origem (`comercial_03`) |
| `source_conversation_id` | uuid | Conversa original |
| `source_message_id` | uuid | Mensagem que disparou o pedido |
| `source_operator` | text | Nome do operador que transferiu |

**Destino (quem recebe):**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `target_instance` | text NOT NULL | Instância destino (`financeiro`) |
| `target_conversation_id` | uuid | Conversa no destino (preenchido se tipo=direct) |
| `target_operator` | text | Nome de quem aceitou |

**Contato:**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `contact_id` | uuid | Contact compartilhado (auto-resolvido pela RPC) |
| `remote_jid` | text NOT NULL | WhatsApp do cliente |
| `contact_name` | text | Nome do contato (auto-resolvido pela RPC) |

**Detalhes:**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `transfer_type` | text | `internal` ou `direct` |
| `category` | text | nf, boleto, rastreio, arte, gravacao, orcamento, cotacao, producao, reclamacao, duvida_tecnica, outro |
| `reason` | text NOT NULL | Motivo da transferência |
| `context_summary` | text | Resumo manual do contexto |
| `context_messages` | jsonb | Últimas 5 mensagens (auto-capturadas pela RPC) |
| `tags` | text[] | Tags livres (`{nf, urgente}`) |

**Status e controle:**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `ticket_number` | serial | Número sequencial legível (TR-0001) |
| `status` | text | pending, accepted, in_progress, completed, returned, rejected, expired, cancelled |
| `priority` | int (1-4) | 1=baixa, 2=normal, 3=alta, 4=urgente |
| `created_at` | timestamptz | Quando foi criado |
| `updated_at` | timestamptz | Última atualização (trigger auto) |
| `accepted_at` | timestamptz | Quando foi aceito |
| `completed_at` | timestamptz | Quando foi resolvido |
| `expires_at` | timestamptz | SLA (auto-calculado pelo trigger) |

**Resolução:**

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `resolution_notes` | text | Como foi resolvido ("NF 78432 enviada por email") |
| `resolution_type` | text | resolved, returned, escalated, cancelled |

### 7.4 — SLA automático por prioridade

Calculado pelo trigger `trg_transfer_auto_sla` no INSERT:

| Prioridade | Valor | SLA | Uso típico |
|------------|-------|-----|-----------|
| P4 | 4 (urgente) | **2 horas** | NF urgente, pedido muito atrasado |
| P3 | 3 (alta) | **4 horas** | Rastreio, reclamação |
| P2 | 2 (normal) | **8 horas** | Aprovação de arte, cotação |
| P1 | 1 (baixa) | **24 horas** | Informação geral, dúvida |

### 7.5 — Categorias de transferência

| Categoria | Rota típica | Exemplo |
|-----------|------------|---------|
| `nf` | Comercial → Financeiro | Cliente pede nota fiscal |
| `boleto` | Comercial → Financeiro | 2ª via de boleto |
| `rastreio` | Comercial → Logística | Status de entrega |
| `arte` | Comercial → Artes | Logo para aprovação de layout |
| `gravacao` | Comercial → Gravação | Status da personalização |
| `producao` | Comercial → Gravação | Status de produção do pedido |
| `orcamento` | Marketing → Comercial | Lead qualificado para vendedor |
| `cotacao` | Comercial → Compras | Cotação de fornecedor |
| `reclamacao` | Comercial → qualquer | Problema com produto ou entrega |
| `duvida_tecnica` | Comercial → Artes/Gravação | Especificação técnica |
| `outro` | qualquer → qualquer | Demais situações |

### 7.6 — RPCs (funções do banco)

| Função | Parâmetros | O que faz |
|--------|-----------|-----------|
| `fn_create_transfer` | source, target, jid, reason, category, priority, type, operator, summary, tags | Cria transfer com auto-captura de contexto (5 msgs), nome do contato, SLA. Dispara pg_notify. |
| `fn_accept_transfer` | transfer_id, operator | Aceita o ticket, seta operador + accepted_at. Bloqueia se não estiver pending. |
| `fn_complete_transfer` | transfer_id, notes, type | Resolve o ticket, calcula duração, notifica origem via pg_notify. |
| `fn_return_transfer` | transfer_id, reason | Devolve ao vendedor com informação. Notifica origem. |
| `fn_transfer_comment` | transfer_id, author, instance, content | Comentário interno entre departamentos. |

### 7.7 — Triggers

| Trigger | Evento | O que faz |
|---------|--------|-----------|
| `trg_transfer_auto_sla` | BEFORE INSERT | Auto-calcula expires_at baseado na prioridade |
| `trg_transfer_notify` | AFTER INSERT | pg_notify para a instância destino (channel: `transfer_{instance}`) |
| `trg_transfer_updated_at` | BEFORE UPDATE | Auto-atualiza updated_at |

### 7.8 — Indexes

| Index | Tipo | Colunas |
|-------|------|---------|
| `conversation_transfers_pkey` | PRIMARY KEY | id |
| `idx_transfers_target` | B-tree | (target_instance, status) |
| `idx_transfers_pending` | Partial B-tree | (target_instance, priority DESC, created_at) WHERE status='pending' |
| `idx_transfers_active` | Partial B-tree | (target_instance) WHERE status IN ('pending','accepted','in_progress') |
| `idx_transfers_contact` | B-tree | (remote_jid) |

### 7.9 — Views de monitoramento

**`v_pending_transfers`** — Painel de pendências por instância:

| Coluna | Descrição |
|--------|-----------|
| target_instance | Departamento |
| pending | Total pendentes |
| urgente | P4 pendentes |
| alta | P3 pendentes |
| sla_estourado | Pendentes com expires_at < now() |
| mais_antiga | Criação do ticket mais antigo |

**`v_transfer_metrics`** — Métricas de resolução:

| Coluna | Descrição |
|--------|-----------|
| target_instance | Departamento |
| total | Total de tickets recebidos |
| completed | Quantos foram resolvidos |
| pending | Quantos ainda pendentes |
| avg_min | Tempo médio de resolução (minutos) |
| within_sla | Resolvidos dentro do SLA |
| missed_sla | Resolvidos fora do SLA |

### 7.10 — Tabela `transfer_comments` (6 colunas)

Comentários internos de acompanhamento entre departamentos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid PK | Auto-gerado |
| `transfer_id` | uuid FK (cascade) | Referência à transferência |
| `author_name` | text NOT NULL | "Raquel" |
| `author_instance` | text NOT NULL | "financeiro" |
| `content` | text NOT NULL | "Gerando NF 78432 agora" |
| `created_at` | timestamptz | Quando foi escrito |

### 7.11 — Realtime

Ambas as tabelas estão publicadas no Supabase Realtime:

- `conversation_transfers` → frontend atualiza fila de pendências em tempo real
- `transfer_comments` → chat interno entre departamentos em tempo real

---

## 8. Fluxo completo de uma transferência (exemplo)

```
 1. Maria (Loja Centro) → Comercial 03: "Preciso da NF do pedido 5520"
 2. Vendedor Paulo clica "Transferir → Financeiro" no frontend
 3. Frontend chama:
    fn_create_transfer(
      'comercial_03', 'financeiro', '5562988001001@s.whatsapp.net',
      'Cliente pede NF urgente pedido 5520', 'nf', 4,
      'internal', 'Vendedor Paulo'
    )
 4. Banco auto-faz:
    ├── Resolve contact_name → "Maria Loja Centro"
    ├── Captura últimas 5 msgs como context_messages
    ├── Calcula SLA: P4 = 2 horas
    ├── pg_notify('transfer_financeiro', {ticket:1, contact:'Maria', ...})
    └── INSERT na conversation_transfers (status=pending)
 5. Financeiro vê no dashboard (v_pending_transfers): 1 urgente
 6. Raquel aceita: fn_accept_transfer(id, 'Raquel Financeiro')
 7. Raquel comenta: fn_transfer_comment(id, 'Raquel', 'financeiro', 'Gerando NF 78432...')
 8. Raquel resolve: fn_complete_transfer(id, 'NF 78432 enviada para maria@lojacentro.com.br')
 9. Banco: pg_notify('transfer_resolved_comercial_03', {ticket:1, resolution:'NF enviada'})
10. Vendedor Paulo vê notificação → responde ao cliente: "NF enviada pro seu email!"
```

---

## 9. Proteções do sistema

| Proteção | Comportamento |
|----------|--------------|
| Double accept | `fn_accept_transfer` retorna `ok:false` se já não estiver pending |
| Complete sem aceitar | `fn_complete_transfer` exige status accepted ou in_progress |
| Return sem aceitar | `fn_return_transfer` exige status accepted ou in_progress |
| SLA automático | Trigger calcula `expires_at` no INSERT, sem intervenção manual |
| Check constraints | transfer_type, category, status, priority — todos validados no banco |

---

## 10. Para adicionar uma nova instância

4 passos — sem downtime, execução em ~2 segundos:

```sql
-- 1. Registrar no registry
INSERT INTO instance_registry (instance_name, slot_name, display_name, department, usage_type)
VALUES ('comercial_16', 'Comercial 16', 'Comercial 16', 'comercial', 'individual');

-- 2. Criar 3 partições
CREATE TABLE evolution_messages_comercial_16
  PARTITION OF evolution_messages FOR VALUES IN ('comercial_16');
CREATE TABLE evolution_conversations_comercial_16
  PARTITION OF evolution_conversations FOR VALUES IN ('comercial_16');
CREATE TABLE evolution_webhook_events_comercial_16
  PARTITION OF evolution_webhook_events FOR VALUES IN ('comercial_16');

-- 3. Criar 3 triggers
CREATE TRIGGER trg_enqueue_media_comercial16 AFTER INSERT ON evolution_messages_comercial_16 ...;
CREATE TRIGGER trg_rewrite_media_url_comercial16 BEFORE INSERT OR UPDATE OF media_url ON evolution_messages_comercial_16 ...;
CREATE TRIGGER trg_auto_media_comercial16 AFTER INSERT OR UPDATE OF media_url ON evolution_messages_comercial_16 ...;

-- 4. Partial index
CREATE INDEX idx_msgs_comercial16_media_meta ON evolution_messages_comercial_16 (...)
  WHERE media_meta IS NOT NULL AND media_url IS NULL;
```

---

## 11. Pendências

| Item | Status |
|------|--------|
| Atribuir vendedores reais às 15 cadeiras | Pendente |
| Definir responsáveis dos 6 departamentos | Pendente |
| Vincular chips WhatsApp reais | Pendente |
| Criar instâncias na Evolution API (POST /instance/create + QR Code) | Pendente |
| Sub-particionamento por data em wpp2 para escala longo prazo | Pendente |
| Reset da sequence ticket_number (permissão supabase_admin) | Pendente |

---

## 12. Testes executados

| Bateria | Cenários | Resultado |
|---------|---------|-----------|
| Multi-instância 21 inst. | Fornecedor compartilhado, carteira isolada, mídias | 43 verificações ✅ |
| Transferências lifecycle | 5 cenários reais + accept/complete/return/comment | 16 verificações ✅ |
| Performance 21 inst. | Benchmark simultâneo | 23ms (1.1ms/msg) ✅ |
| Proteções | Double accept, complete sem aceitar, SLA auto | Todos bloqueados ✅ |

---

*Documentação gerada em 05/05/2026 — Zap Webb v2.0 — Promo Brindes*
