

## Configuração de retry por instância (sem deploy)

### Estado atual

- `useEvolutionApiCore.callApi` aceita `retries`, `baseBackoffMs`, `timeoutMs` por chamada (defaults: 1/3, 250ms, 30s) — mas **nenhum caller passa**.
- `invokeEvolutionWithRetry` (envios) tem `maxRetries=3`, `baseDelayMs=800`, `maxDelayMs=6000` **hardcoded**.
- `messageSender.ts` passa `MAX_RETRIES` (constante de módulo).
- Tabela `global_settings (key, value, description)` já existe e funciona como KV. Sem chaves de retry hoje.

### Solução

Configuração **por instância** (com fallback global → defaults), persistida em `global_settings`, lida em runtime sem reload.

**1. Convenção de chaves em `global_settings`**

```
retry.global.maxRetries           → "3"
retry.global.baseBackoffMs        → "800"
retry.global.maxBackoffMs         → "6000"
retry.global.timeoutMs            → "30000"
retry.instance.<name>.maxRetries  → "5"      (override opcional)
retry.instance.<name>.baseBackoffMs ...
retry.instance.<name>.timeoutMs ...
```

Resolução: `instance.<name>.X` ?? `global.X` ?? hardcoded default.

**2. `src/lib/retryConfig.ts`** (novo)

- `RetryConfig = { maxRetries, baseBackoffMs, maxBackoffMs, timeoutMs }`.
- `DEFAULT_RETRY_CONFIG = { maxRetries: 3, baseBackoffMs: 800, maxBackoffMs: 6000, timeoutMs: 30000 }`.
- `RANGES`: maxRetries 1–10, baseBackoff 100–10000, maxBackoff 1000–60000, timeout 5000–120000 (validação + clamp).
- Cache in-memory `Map<instanceName | '_global', RetryConfig>` com TTL 60s.
- `loadRetryConfig(instanceName?: string): Promise<RetryConfig>`:
  - Lê 8 keys (`global.*` + `instance.<name>.*`) de `global_settings` numa query com `.in('key', [...])`.
  - Mescla, valida via `RANGES.clamp(v)`, devolve config final.
  - Usa cache se válido.
- `invalidateRetryConfigCache(instanceName?)` — chamado pela UI ao salvar.
- `getRetryConfigSync(instanceName?)` — devolve do cache OU defaults (não bloqueia render).

**3. `src/lib/evolutionSendRetry.ts`** — usar config dinâmica

- Antes do `withRetry(...)`, chamar `await loadRetryConfig(instanceName)`.
- Substituir hardcodes (800/6000/3) pelos valores da config.
- Mantém `config.maxRetries` opcional como override por chamada (ainda vence).

**4. `src/hooks/evolution/useEvolutionApiCore.ts`** — usar defaults dinâmicos

- Quando `opts.retries`/`baseBackoffMs`/`timeoutMs` não vierem, ler `getRetryConfigSync(action.instanceName?)` — mas como `callApi` não conhece instância, usar config **global** apenas. Override por chamada continua possível.
- Disparar `loadRetryConfig()` em background (fire-and-forget) para esquentar cache no primeiro render do hook.

**5. `src/hooks/messaging/useInstanceRetryConfig.ts`** (novo)

- Hook React: `useInstanceRetryConfig(instanceName?)` → `{ config, isLoading, save(partial), reset() }`.
- `save` faz upsert em `global_settings` para cada chave alterada (uma a uma, dentro de `Promise.all`), valida via `RANGES`, invalida cache, mostra toast.
- `reset` deleta as `instance.<name>.*` (volta ao global).

**6. `src/components/admin/RetryConfigPanel.tsx`** (novo)

- Card admin-only com:
  - Select de instância (popular via `evolution_stage_mapping` distinct OU lista hardcoded `['_global', 'wpp2']` — pegar de `whatsapp_connections.instance_id`).
  - 4 campos com `Slider` + `Input` numérico:
    - Max retries (1–10)
    - Base backoff ms (100–10000, step 100)
    - Max backoff ms (1000–60000, step 500)
    - Timeout ms (5000–120000, step 1000)
  - Indicador "herda do global" se a instância não tem override.
  - Botões: "Salvar", "Restaurar global" (apaga overrides), "Restaurar default" (só visível em `_global`).
  - Mostra preview do efeito: "1ª tentativa imediata, 2ª em ~800ms, 3ª em ~1600ms, abort em 30s".

**7. Integração**

- Adicionar tab/card `RetryConfigPanel` em `AdminFailedMessagesPage.tsx` no topo (logo abaixo do header) ou em `MonitoringPage` — escolho `AdminFailedMessagesPage` por afinidade temática.
- Sem migração SQL: `global_settings` já existe e RLS atual cobre admin (assumindo policy existente).

**8. Testes — `src/lib/__tests__/retryConfig.test.ts`**

- `clampToRange`: valores fora dos limites são corrigidos.
- `loadRetryConfig`: mock supabase → instance override vence global; sem chaves → defaults; cache TTL respeitado.
- `getRetryConfigSync`: devolve defaults antes de carregar; cacheado depois.

### Comportamento

| Cenário | Resultado |
|---|---|
| Operador detecta picos de timeout em `wpp2` | Aumenta `timeoutMs` para 60s só nessa instância via UI |
| Evolution Eco fica boa de novo | Reduz `maxRetries` para 2 via UI, reduzindo carga |
| Sem nada configurado | Usa hardcoded defaults atuais (sem mudança de comportamento) |
| Caller passa `{ maxRetries: 5 }` na invocação | Override por chamada vence (back-compat) |
| 2 abas abertas, admin salva | Cache local da outra aba expira em 60s |

### Compatibilidade

- Zero breaking change. Sem config, comportamento idêntico ao atual.
- API pública dos hooks/funcs inalterada — só os defaults ficam dinâmicos.
- Sem nova dependência. Usa `Slider`, `Input`, `Button`, `Select` já existentes.

### Arquivos editados/criados

- `src/lib/retryConfig.ts` (novo)
- `src/lib/__tests__/retryConfig.test.ts` (novo)
- `src/hooks/messaging/useInstanceRetryConfig.ts` (novo)
- `src/components/admin/RetryConfigPanel.tsx` (novo)
- `src/lib/evolutionSendRetry.ts` (usa config dinâmica)
- `src/hooks/evolution/useEvolutionApiCore.ts` (usa defaults dinâmicos)
- `src/pages/AdminFailedMessagesPage.tsx` (monta o painel)

### Fora de escopo

- Sem propagação para edge functions (proxy server-side mantém defaults — out-of-scope; este plano é client-side). Se quiser depois, mesma convenção de keys funciona lá.
- Sem histórico de mudanças (audit_logs já capturaria via trigger, mas `global_settings` não tem trigger hoje — não vou criar).
- Sem rate-limit de saves; UI já tem disabled state durante mutation.

