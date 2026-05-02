## O que descobri rodando o build de verdade

`bunx vite build` falha com **um único erro real** no momento, mas que bloqueia toda a publicação:

```
src/hooks/useEvolutionAutoSync.ts:4
"isSamePhone" is not exported by "src/lib/phoneUtils.ts"
```

`phoneUtils.ts` exporta `phonesMatch` (linha 146), que faz exatamente o mesmo papel — alguém importou com nome antigo. O TypeScript não pega isso porque `tsconfig.app.json` tem `strict: false` + `noImplicitAny: false`, então o resolver é permissivo. Já o Rollup, que monta o bundle real, é estrito.

Esse é o "erro real" que o pipeline precisa enxergar. Tudo o que vem antes (113 arquivos do registry de roteamento, dompurify, gmailRefreshToken) já está verde no `tsc --noEmit`.

## Diagnóstico do pipeline atual

`package.json`:
```
"build": "vite build"
```

`.github/workflows/ci.yml` separa em jobs corretos:
1. `lint-and-typecheck` — roda `npx tsc --noEmit` (passa hoje)
2. `build` — roda `npm run build` (falha agora por causa do `isSamePhone`)

Problemas:

- **Local não simula CI**: não há um único comando `npm run check` que rode TSC + ESLint + Vite build. Quando alguém roda só `bun dev` ou `tsc`, não vê esse tipo de erro até o CI explodir.
- **Vite build aceita warnings de chunk grande sem alarde** (`chunkSizeWarningLimit: 1700`) mas falha por export inexistente — comportamento correto, só precisa ser usado.
- **ESLint hoje permite `import { foo }` mesmo se `foo` não existir** — a regra `import/no-unresolved` não está habilitada porque o plugin `eslint-plugin-import` não está instalado. Adicionar isso transforma erros como o `isSamePhone` em fail rápido (em ms, não em 20s de Rollup).
- **Dependências fantasma**: `package.json` tem `vitest` em `dependencies` (deveria ser `devDependencies`) e algumas libs de QA (`@axe-core/react`, `@playwright/test`, `@testing-library/*`, `@types/*`, `jsdom`) também estão em `dependencies`. Não bloqueia build mas infla o bundle e atrapalha auditoria. Não vou mexer nessa rodada para não estourar o escopo — só vou anotar.

## Plano de ação

### Passo 1 — Corrigir o erro real que bloqueia produção (1 arquivo)

Em `src/lib/phoneUtils.ts`, depois do `export function phonesMatch`, adicionar:

```ts
/**
 * Alias semântico de `phonesMatch` — mantido para compatibilidade.
 * Prefira `phonesMatch` em código novo.
 */
export const isSamePhone = phonesMatch;
```

Único uso é `useEvolutionAutoSync.ts:54` e a semântica bate exatamente.

### Passo 2 — Endurecer o build local para falhar igual ao CI

Em `package.json`, adicionar scripts compostos:

```jsonc
{
  "scripts": {
    "build": "vite build",
    "typecheck": "tsc --noEmit -p tsconfig.app.json",
    "check":     "npm run typecheck && npm run lint && npm run build",
    "verify":    "npm run check"
  }
}
```

Razão: `npm run check` reproduz exatamente o gate do CI antes do push. Quando alguém roda local, vê o mesmo erro que o GitHub Actions vê.

### Passo 3 — Validar que `vite build` passa (sem custom flag, build atual já falha em export inexistente)

O Rollup já trata `export X from Y` ausente como erro fatal — o comportamento desejado já existe nativamente. Não precisa de nenhuma flag custom. Vou apenas rodar `bun run build` depois do passo 1 para confirmar que o bundle é gerado.

### Passo 4 — Pequeno endurecimento opcional do `tsconfig.app.json`

Mudar `noUnusedLocals` e `noUnusedParameters` para `true` é tentador mas vai gerar centenas de warnings agora — fora do escopo. Em vez disso, propus apenas:

- Manter `tsconfig.app.json` como está (compatibilidade com a base atual).
- Garantir que o CI continue rodando `tsc --noEmit` (já roda).
- O combo `typecheck + build` no script `check` cobre as duas dimensões: types + bundling real.

### Passo 5 — Documentar no `package.json` (sem novos arquivos)

A descrição dos scripts fica auto-explicativa pelos nomes. Não vou criar README novo — `npm run check` é o contrato.

## O que NÃO faço nesta rodada (anotações para depois)

- Mover `vitest`, `@playwright/test`, `@testing-library/*`, `jsdom`, `@axe-core/react`, `@types/dompurify`, `@vitejs/plugin-react`, `@types/react*` (subset) para `devDependencies`. Risco baixo, mas mexe em ~10 entradas e quero manter este PR cirúrgico.
- Adicionar `eslint-plugin-import` para detectar imports inexistentes em ms. Útil, mas requer install + nova regra em `eslint.config.js`. Posso fazer em PR separado se você quiser.
- Promover globs do `STRICT ZONE` no `eslint.config.js` para mais arquivos. Migração de tipo separada.

## Entregáveis desta rodada

1. `src/lib/phoneUtils.ts` — adiciona `export const isSamePhone = phonesMatch;`
2. `package.json` — adiciona scripts `typecheck`, `check`, `verify`
3. Rodar `bun run check` (typecheck + lint + build) e mostrar saída verde

Aprova para eu executar?
