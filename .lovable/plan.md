

## Painel de Saúde do Webhook & Incidentes da Eco API

Centralizar em um único painel admin: status do `WEBHOOK_SECRET`, incidentes recentes de assinatura inválida do webhook, e respostas `401/403` da Eco/Evolution API por instância.

### O que será construído

#### 1. Backend — captura de incidentes (já parcialmente disponível)

**A. `webhook-secret-status` (já existe)** — reaproveitar o endpoint atual que devolve `{ configured, length, hashPrefix, strictMode, checkedAt }`.

**B. Tabela nova `evolution_incidents`** (Lovable Cloud):
```
id uuid pk
instance_name text not null         -- ex.: 'wpp2'
incident_type text not null         -- 'invalid_signature' | 'auth_401' | 'auth_403'
http_status int                     -- 401, 403, null para invalid_signature
source text                         -- 'evolution-webhook' | 'evolution-api' | 'connect'
details jsonb                       -- header recebido, path, mensagem
created_at timestamptz default now()
```
RLS: SELECT/INSERT só `is_admin_or_supervisor`. Índice em `(instance_name, created_at desc)` e `(incident_type, created_at desc)`.

**C. Pontos de captura** (escrita via service role nas edge functions):
- `evolution-webhook/index.ts` → quando assinatura HMAC falhar, registra `invalid_signature` com header recebido (sem o segredo).
- `_shared/evolution-api-proxy.ts` e `evolution-api/index.ts` → quando Eco devolver `401/403`, registra `auth_401`/`auth_403` com o `path` e `instanceName`.

**D. Edge function nova `evolution-incidents`** (GET, admin-only):
- Aceita `?instance=wpp2&hours=24&type=auth_401`.
- Devolve lista paginada (50) + agregados por instância e por tipo nas últimas 24h.

#### 2. Frontend — novo card no painel de monitoramento

Local: dentro de `MonitoringWebhookPanel.tsx` (já existe e mostra o status do secret), adicionar:

**A. Card "Status do WEBHOOK_SECRET"** (já presente) — mantém: configurado/sim ou não, comprimento, hash prefix, modo strict, última checagem; botão "Recarregar".

**B. Card novo "Incidentes recentes (24h)"** com:
- Filtros: instância (select), tipo (Todos | Assinatura inválida | 401 | 403), janela (1h | 6h | 24h | 7d).
- Resumo: 3 KPIs (assinatura inválida, 401, 403) com contagem e variação vs janela anterior.
- Tabela: instância | tipo | status | source | "há quanto tempo" | botão expandir para ver `details` (JSON formatado).
- Empty state padrão (`GenericEmptyState`) quando não houver incidentes.
- Atualização automática a cada 30s + botão refresh manual.

**C. Hook novo `useEvolutionIncidents.ts`** consumindo a edge function via `supabase.functions.invoke('evolution-incidents', ...)`. Cache `staleTime: 15s`. Realtime `postgres_changes` em `evolution_incidents` para atualização instantânea.

#### 3. Navegação

O painel já é renderizado dentro da rota de monitoramento (`/admin/monitoring` via `MonitoringPanel`). Não cria nova rota — apenas estende a aba existente "Webhook" com a nova seção "Incidentes".

### Critérios de aceite

- Admin acessa `/admin/monitoring` → aba Webhook → vê status do secret + incidentes.
- Falha de HMAC no webhook gera nova linha em até 5s (realtime).
- Resposta `401` da Eco em ação `connect` para `wpp2` aparece como incidente `auth_401` com instância e path.
- Não-admins recebem 403 ao tentar consumir a edge function ou ler a tabela (RLS).
- O segredo nunca é exposto — só o prefixo SHA-256.

### Arquivos afetados

**Novos**
- `supabase/migrations/<timestamp>_evolution_incidents.sql`
- `supabase/functions/evolution-incidents/index.ts`
- `src/hooks/monitoring/useEvolutionIncidents.ts`
- `src/components/monitoring/IncidentsPanel.tsx`

**Editados**
- `supabase/functions/evolution-webhook/index.ts` — registrar `invalid_signature`
- `supabase/functions/_shared/evolution-api-proxy.ts` — registrar `auth_401/403`
- `supabase/functions/evolution-api/index.ts` — registrar `auth_401/403` no fluxo connect
- `src/components/monitoring/MonitoringWebhookPanel.tsx` — montar `IncidentsPanel`

### Riscos & mitigação

- **Volume de incidentes** pode crescer rápido se houver chave inválida → adicionar cron de cleanup (>30 dias) similar ao `cleanup_old_send_failures`.
- **Loop de gravação** se a própria escrita falhar → usar `service_role` direto e tolerar erro silencioso (não relançar).
- **Leak do segredo** → o hash prefix mantém só 4 bytes do SHA-256 (já implementado).

