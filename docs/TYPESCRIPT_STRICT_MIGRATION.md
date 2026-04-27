# TypeScript Strict Migration

Estratégia incremental para chegar a `strict: true` sem quebrar a build.

## Estado atual (snapshot)

| Escopo | Config | Status |
|---|---|---|
| `tsconfig.app.json` (produção) | `strict: false`, `noImplicitAny: false` | Baseline — não bloqueia build |
| `tsconfig.test.json` (testes) | `strict: true`, `noImplicitAny: true` | ✅ Strict total |
| `tsconfig.node.json` (vite/tools) | `strict: true` | ✅ Strict total |
| `tsconfig.strict.json` (CI check) | `noImplicitAny: true` | 🟡 Informativo — 134 erros pendentes |

## Como rodar o check strict

```bash
npx tsc -p tsconfig.strict.json --noEmit
```

Esse comando **não** bloqueia a build. Use para acompanhar o progresso da migração e validar que novos arquivos entram já compatíveis.

## Regras ESLint por zona

1. **Global (todo `src/**/*.{ts,tsx}`)** — `@typescript-eslint/no-explicit-any` = `warn`. PRs ganham aviso visível para qualquer `any` novo.
2. **Testes** — `no-explicit-any` = `error`. Use os helpers em `src/test/typing.ts` (`asTyped`, `mockOf`, `asMock`, `globalAs`) em vez de `as any`.
3. **Zona strict** (lista em `eslint.config.js` → último bloco) — `no-explicit-any` = `error` + `consistent-type-assertions`. Arquivos já migrados não regridem.

## Como promover um arquivo para a zona strict

1. Garanta que `npx tsc --noImplicitAny --noEmit <arquivo>` passa.
2. Substitua todo `as any` por `unknown` + type guard (use `src/lib/runtimeGuards.ts`).
3. Adicione o caminho ao array `files` do bloco "STRICT ZONE" em `eslint.config.js`.
4. Rode `npx eslint <arquivo>` — deve passar sem warnings.

## Roadmap de promoção

| Fase | Critério | Ação |
|---|---|---|
| 1 (atual) | warn global, strict zone manual | ✅ Implementado |
| 2 | < 50 erros em `tsc -p tsconfig.strict.json` | Promover `noImplicitAny` para `tsconfig.app.json` |
| 3 | 0 erros strict | Ligar `strict: true` no app, deprecar `tsconfig.strict.json` |
| 4 | Estável por 2 semanas | Promover `no-explicit-any` global de `warn` → `error` |

## Hotspots atuais (top 10)

Gere a lista atualizada com:

```bash
npx tsc -p tsconfig.app.json --noImplicitAny --noEmit 2>&1 \
  | grep "error TS7" | sed -E 's|\(.*||' \
  | sort | uniq -c | sort -rn | head -10
```

Snapshot inicial (134 erros total — predominância em testes):
- `src/hooks/__tests__/useMessagesCursor.test.tsx` — 20
- `src/hooks/__tests__/useExternalMessagesBroadcast.test.tsx` — 17
- `src/components/inbox/chat/__tests__/ChatMessagesArea.localMode.test.tsx` — 10
- `src/lib/__tests__/evolutionSendRetry.breaker.test.ts` — 6
- `src/hooks/__tests__/useExternalCatalog.test.ts` — 6
- `src/hooks/useSLAAlerts.ts` — 5 (produção — alta prioridade)
- `src/test/mocks/auth.tsx` — 4
- `src/pages/AdminWebhookSecretStatusPage.tsx` — 4 (produção)
- `src/components/admin/AdminView.tsx` — 3 (produção)
- `src/components/admin/AdminUsersTable.tsx` — 3 (produção)

## Política para novas PRs

- ❌ Não introduza `any` explícito — o lint vai avisar.
- ✅ Use `unknown` + narrowing via `src/lib/runtimeGuards.ts`.
- ✅ Em testes, use `src/test/typing.ts` (`asTyped<T>(value)` em vez de `value as any as T`).
- ✅ Arquivos novos devem nascer dentro da zona strict — adicione o path ao bloco final do `eslint.config.js`.
