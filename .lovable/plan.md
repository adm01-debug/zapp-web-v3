# Painel de Stress Test Multi-mídia (200 envios)

## Objetivo
Disparar 200 mensagens reais para o WhatsApp **64 98445-0900 (Joaquim)** cobrindo todos os tipos de mídia que o ZAPP envia hoje, com **5 segundos** entre cada, parando imediatamente na 1ª falha. Saída: relatório de tempos, status, erros.

## Distribuição (25 de cada — 200 total)
| # | Tipo | Origem do conteúdo |
|---|---|---|
| 25 | Texto | gerado: `"Stress test #N — {timestamp}"` |
| 25 | Imagem | sample do bucket `whatsapp-media` (até 5 URLs em rotação) |
| 25 | Vídeo curto | sample do bucket |
| 25 | Áudio voz (PTT) | sample do bucket |
| 25 | Áudio meme | sorteado de `audio_memes` (542 disponíveis) |
| 25 | Sticker | sorteado de `stickers` (340 disponíveis) |
| 25 | Documento (PDF) | sample do bucket |
| 25 | Localização | coords de Goiânia variando ±0.01 |

## Onde fica
Nova rota admin-only **`/admin/stress-test`** (entrada na sidebar admin "Operações"). Acessível apenas para `role = 'admin'`.

## Como funciona (visão do operador)
```text
┌──────────────────────────────────────────────────┐
│  Stress Test — WhatsApp Multi-mídia              │
│  ──────────────────────────────────────────────  │
│  Destino: 64 98445-0900 (Joaquim)        [edit]  │
│  Instância: wpp2                                 │
│  Total: 200    Intervalo: 5s    Política: stop   │
│                                                   │
│  [▶ Iniciar]  [■ Parar]   ⏱ ETA: ~17 min         │
│                                                   │
│  Progresso: ████████░░░░░░░░░  87/200 (43%)      │
│  ✅ Sucesso: 86   ❌ Falhas: 1   ⏭ Pulados: 0    │
│                                                   │
│  Log ao vivo:                                    │
│  13:42:01 ✅ #086 sticker (id=abc...)  812ms     │
│  13:41:56 ✅ #085 audio_meme           654ms     │
│  13:41:51 ❌ #084 video — timeout 30s            │
│           ↳ TESTE PARADO automaticamente         │
└──────────────────────────────────────────────────┘
```

## Salvaguardas críticas
1. **Confirmação dupla** antes de iniciar: modal "Vou enviar 200 mensagens reais para 64 98445-0900. Risco de bloqueio anti-spam da Meta. Confirmar?" → digita `CONFIRMAR` para liberar.
2. **Botão Parar sempre visível** — interrompe o loop entre envios.
3. **Stop na 1ª falha** (sua escolha) — o `Promise` quebra, log marca o erro, instância preservada.
4. **Lock global** — só 1 stress test rodando por vez (flag em memória + `localStorage`). Se já houver run ativo, bloqueia novo start.
5. **Restrito a admin** — gating no `RoleProvider` igual outras páginas `/admin/*`.
6. **Log persistente** em `stress_test_runs` (ver schema abaixo) para histórico e auditoria.

## Schema novo
```sql
create table public.stress_test_runs (
  id uuid primary key default gen_random_uuid(),
  started_by uuid not null references auth.users(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  target_phone text not null,
  instance_name text not null,
  total_planned int not null,
  total_sent int not null default 0,
  total_failed int not null default 0,
  status text not null default 'running',  -- running | completed | aborted | failed
  abort_reason text,
  results jsonb not null default '[]'::jsonb  -- array de {idx, type, status, ms, error?, message_id?}
);
-- RLS: admin-only (select/insert/update via has_role check)
```

## Implementação técnica

### Arquivos novos
- `src/pages/admin/AdminStressTestPage.tsx` — UI completa (form, progresso, log)
- `src/lib/stressTest/runner.ts` — orquestrador puro (loop sequencial, abort signal, callbacks)
- `src/lib/stressTest/mediaSamplers.ts` — funções que sorteiam 1 sticker/áudio/imagem/etc do banco/bucket
- `src/lib/stressTest/__tests__/runner.test.ts` — 6 testes (stop on fail, abort, distribuição, intervalo respeitado)
- Migration `stress_test_runs` + RLS admin-only

### Arquivos editados
- `src/lib/sidebarNavConfig.ts` — link "Stress Test" sob "Admin → Operações"
- `src/pages/ViewRouter.tsx` — rota lazy `/admin/stress-test` com role gate

### Reuso (não duplica código)
- `useEvolutionApi()` → expõe `sendText`, `sendMedia`, `sendAudio`, `sendSticker`, `sendLocation`
- `evolution-api` edge function — já trata retry/erros/instância
- `stickers` + `audio_memes` tables — sample direto via Supabase
- `withRequestId` para correlação com webhook

### Loop principal (pseudo)
```typescript
const PLAN: TaskType[] = shuffle(buildBalancedPlan(200)); // 25 de cada, embaralhado
for (let i = 0; i < PLAN.length; i++) {
  if (abortSignal.aborted) { setStatus('aborted'); break; }
  const t0 = performance.now();
  try {
    const result = await dispatch(PLAN[i], { phone, instance: 'wpp2' });
    appendResult({ idx: i, type: PLAN[i], status: 'ok', ms: performance.now() - t0, ...result });
  } catch (err) {
    appendResult({ idx: i, type: PLAN[i], status: 'fail', ms: performance.now() - t0, error: err.message });
    setStatus('failed'); break;  // política "stop on first failure"
  }
  await sleep(5000); // intervalo fixo
}
```

## Fora de escopo (não vou fazer agora)
- Reagendamento automático após falha
- Disparo paralelo (proposital — 5s sequencial é mais seguro pro WhatsApp)
- Variação de número de destino (o número fica fixo por run, mas editável antes do start)
- Métricas Grafana (logs ficam em `stress_test_runs`, suficiente)

## ETA real
- 200 × 5s = 1.000s de espera + ~200 × 1s de envio ≈ **~20 minutos de execução**
- Tempo de implementação: ~15 min
