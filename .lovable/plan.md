

## Automatizar testes Deno de `evolution-api` no CI

Garantir que toda PR/push execute a suíte Deno da edge function `evolution-api` (incluindo os testes refatorados de `send-media` e `send-audio`) e bloqueie o merge se algum falhar.

### Mudança em `.github/workflows/ci.yml`

Adicionar um novo job **`deno-edge-tests`** paralelo aos jobs Node existentes (`lint-and-typecheck`, `test`, `build`, `security`). O job `build` passa a depender também desse novo job, garantindo que PRs com testes Deno quebrados não cheguem ao build.

```yaml
deno-edge-tests:
  name: 🦕 Deno Edge Function Tests
  runs-on: ubuntu-latest
  steps:
    - name: 📥 Checkout code
      uses: actions/checkout@v4

    - name: 🦕 Setup Deno
      uses: denoland/setup-deno@v1
      with:
        deno-version: v1.x

    - name: 🧪 Run evolution-api Deno tests
      working-directory: supabase/functions/evolution-api
      run: |
        deno test \
          --allow-net \
          --allow-env \
          --allow-read \
          --reporter=pretty \
          __tests__/
```

E na declaração do job `build`:

```yaml
build:
  needs: [lint-and-typecheck, test, deno-edge-tests]
```

### Por que assim

- **Sem segredos necessários**: a suíte refatorada é 100% offline — análise estática de `index.ts` + stub de `globalThis.fetch` via `withFetchStub`. Não precisa de `EVOLUTION_API_URL`, `SUPABASE_URL`, etc.
- **Permissões mínimas**: `--allow-net` (somente para o `import` de `deno.land/std`), `--allow-env` (Deno test exige), `--allow-read` (helper `readSource()` lê `../index.ts`).
- **Escopo cirúrgico**: roda só `supabase/functions/evolution-api/__tests__/` para manter o CI rápido (~5s). Se mais funções ganharem testes Deno depois, o job pode ser generalizado.
- **Bloqueia merge**: como `build` depende dele e branch protection exige `build` verde, qualquer regressão em `send-media` / `send-audio` quebra a PR.
- **Cache**: `denoland/setup-deno@v1` já habilita cache de dependências por padrão via `~/.cache/deno`.

### Verificação

Após o merge, abrir uma PR de teste (ex.: introduzir uma quebra proposital em `send-media-audio-instance.test.ts` localmente, observar o status check `🦕 Deno Edge Function Tests` falhar, reverter).

### Arquivos afetados

- `.github/workflows/ci.yml` (adiciona job `deno-edge-tests`, atualiza `needs:` do job `build`)

