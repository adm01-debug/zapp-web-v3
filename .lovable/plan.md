
# Auto-reconexão de conexões Evolution (wpp2) com backoff exponencial

## Objetivo
Quando uma conexão (ex.: `wpp2`) cair, o sistema tenta reconectá-la sozinho — sem o usuário precisar clicar em **Reconectar** — com tentativas espaçadas em backoff exponencial e parada graciosa quando o caso exigir QR Code humano.

## Estado atual (já existe)
- Tabela `whatsapp_connections` com `status`, `health_status`, `health_reason`, `last_health_check`.
- Edge function `connection-health-check` faz o diagnóstico em 3 camadas (socket / owner / atividade) e atualiza `status` para `disconnected` quando aplicável.
- Edge function `evolution-api` já expõe ações `connect`, `restart-instance` e `status`.
- Componente `EvolutionDisconnectBanner` que hoje só faz reconexão **manual** (botão Reconectar).
- Não existe nenhum laço de auto-retry: se ninguém clicar, a conexão fica caída indefinidamente.

## Como vai funcionar

```text
health-check detecta DOWN
        │
        ▼
INSERT em connection_reconnect_attempts (attempt=1, next_attempt_at=now+30s)
        │
        ▼
auto-reconnect-worker (cron a cada 1 min)
   ├─ pega tentativas com next_attempt_at <= now e status='pending'
   ├─ chama evolution-api action='restart-instance' (1ª) ou 'connect' (2ª+)
   ├─ confere status via 'connectionState'
   │     ├─ open  → marca succeeded, limpa fila, notifica
   │     └─ closed/qr → agenda próxima com backoff(attempt+1)
   └─ ao atingir MAX_ATTEMPTS=6 → marca exhausted + cria warroom_alert
        │
        ▼
Se motivo = QR Code obrigatório (sessão expirada do lado do WhatsApp)
   → para imediatamente, cria alerta "intervenção manual: escanear QR"
```

### Backoff
Exponencial com jitter: `delay = min(30s · 2^(attempt-1), 30min) ± 15%`
- Tent. 1: ~30s · Tent. 2: ~1min · Tent. 3: ~2min · Tent. 4: ~4min · Tent. 5: ~8min · Tent. 6: ~16min → depois para.

### Quando NÃO tentar de novo
- `EVOLUTION_AUTH_ERROR` (chave inválida) → para e alerta admin.
- Resposta indica QR pendente (estado `connecting` com QR) → para e pede ação humana.
- Janela de manutenção (flag em `system_settings`, opcional).

## Mudanças no código

### 1. Banco (Lovable Cloud — migration)
Nova tabela `connection_reconnect_attempts`:
- `id uuid pk`, `connection_id uuid fk`, `instance_id text`
- `attempt int`, `status text` (`pending|in_progress|succeeded|failed|exhausted|aborted`)
- `next_attempt_at timestamptz`, `last_error text`, `last_action text`
- `created_at`, `updated_at`
- RLS: leitura para admin/supervisor, escrita só service role.
- Índice em `(status, next_attempt_at)`.

Trigger em `whatsapp_connections`: quando `status` muda para `disconnected` e ainda não há tentativa `pending`, insere a primeira (attempt=1, +30s). Quando volta para `connected`, marca tentativas pendentes daquela conexão como `aborted`.

### 2. Edge function nova: `auto-reconnect-worker`
- Roda via cron `pg_cron` a cada 1 min (configurado em `supabase/config.toml`/migration).
- Lê tentativas `pending` vencidas, faz `UPDATE … status='in_progress'` (lock otimista).
- Chama `evolution-api`:
  - 1ª tentativa: `restart-instance` (mais leve).
  - 2ª+: `connect`.
- Em seguida `status` → confere `state`. Se `open`, marca `succeeded` e força um `connection-health-check` daquela instância para sincronizar UI.
- Se falhar, agenda próxima com `computeBackoff(attempt+1)`. Se `attempt >= 6`, marca `exhausted` e dispara `warroom_alerts` + `notifications` (reaproveitando preferências já existentes).
- Loga em `audit_logs` (`action='connection_auto_reconnect'`).

### 3. Componente `EvolutionDisconnectBanner` (UI)
- Mostra estado da auto-reconexão lendo `connection_reconnect_attempts` em realtime:
  - `pending`: "Tentando reconectar… próxima tentativa em N s (3/6)".
  - `in_progress`: spinner "Reconectando…".
  - `succeeded`: banner some sozinho.
  - `exhausted`: vira mensagem vermelha pedindo ação manual + botão **Reconectar agora** (mesmo fluxo de hoje, que abre tela de QR).
- Botão **Reconectar** manual continua funcionando e zera o contador (insere nova tentativa attempt=1).

### 4. Pequeno utilitário compartilhado
`supabase/functions/_shared/reconnect-backoff.ts` com `computeReconnectBackoffMs(attempt)` (constantes acima) + teste Deno.

### 5. Tela admin (mínima, opcional nesta fase)
Em `/admin/operations` (já existe aba **Logs**), adicionar uma tabela "Auto-reconnect" com últimas 50 tentativas (instance, attempt, status, last_error, próxima execução). Só admin/supervisor vê.

## Critérios de aceitação
- Derrubar `wpp2` (banner aparece) → em até ~30s o worker tenta sozinho; banner mostra contador.
- Se a Evolution responder OK, conexão volta para `connected` e o banner desaparece sem clique.
- Após 6 falhas, banner muda para "ação manual necessária" + alerta no warroom.
- QR Code pendente nunca entra em loop infinito de retry.
- Cooldown de 30 s do clique manual (já existe) não é afetado.

## Riscos / decisões
- **Cron de 1 min** é aceitável (latência máx. ≈ 60 s + 30 s do primeiro delay). Se quiser mais rápido, podemos chamar o worker direto do trigger via `pg_net`, mas isso aumenta acoplamento — proponho ficar com cron por simplicidade.
- Se `EVOLUTION_API_KEY` estiver inválida, retry vira spam — por isso o curto-circuito em `EVOLUTION_AUTH_ERROR`.
- Não mexe em `send_failures.auto_reconnect_*` (esses são de envio de mensagem, escopo diferente).

Após aprovação eu faço a migration, crio o edge function `auto-reconnect-worker`, ajusto o `EvolutionDisconnectBanner` e adiciono os testes do backoff.
