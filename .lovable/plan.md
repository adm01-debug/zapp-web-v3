

## Validador automatizado: diagrama de fan-out vs. realidade

### Entregável

Teste Vitest em `src/test/realtimeFanout.test.ts` que parseia `/mnt/documents/TRILHA_MENSAGENS_NAVEGAVEL.mmd` e falha se algum nó referenciado no diagrama deixar de existir no repositório, ou se algum dos consumidores conhecidos de `postgres_changes` na tabela `messages` não estiver listado no diagrama.

### O que o teste cobre

1. **Existência dos arquivos clicáveis** — para cada `click NodeId "src/..."` no `.mmd`, valida que o caminho existe (`fs.existsSync`). Falha se um hook foi removido/renomeado sem atualizar o diagrama.

2. **Sincronia do fan-out realtime** — varre `src/**/*.{ts,tsx}` por arquivos que assinam `postgres_changes` em `table: 'messages'` e compara com a lista canônica anotada no `.mmd` (8 consumidores). Falha em duas direções:
   - **Hook órfão no código**: arquivo escuta `messages` mas não está listado no diagrama → diagrama desatualizado.
   - **Hook fantasma no diagrama**: listado no diagrama mas o arquivo já não escuta → diagrama desatualizado.

3. **Allowlist explícito** — a lista de consumidores esperados fica num array no topo do teste (`EXPECTED_REALTIME_CONSUMERS`) extraído dos comentários `%%` do `.mmd`. Mudou? Atualiza os dois lados conscientemente.

### Como vou construir

1. Confirmar que `vitest` já roda no projeto (memória `vitest-baseline` confirma 2380+ testes).
2. Copiar `/mnt/documents/TRILHA_MENSAGENS_NAVEGAVEL.mmd` para dentro do repo em `src/test/fixtures/TRILHA_MENSAGENS_NAVEGAVEL.mmd` — testes não conseguem ler `/mnt/documents` em CI.
3. Escrever `src/test/realtimeFanout.test.ts` com 3 `it(...)`:
   - `it('todos os caminhos clicaveis existem')`
   - `it('todo arquivo que escuta messages esta no diagrama')`
   - `it('todo consumidor do diagrama ainda escuta messages')`
4. Detector de assinatura: regex `/supabase\s*\.channel\([\s\S]*?table:\s*['"]messages['"]/` (multilinha, tolerante a quebras).
5. Rodar `code--run_tests` para validar.

### Detalhes técnicos

- Sem dependências novas — usa `node:fs`, `node:path`, `fast-glob` já presente (verificar) ou `fs.readdirSync` recursivo.
- Excludes: `**/__tests__/**`, `**/*.test.{ts,tsx}`, `**/test/**`, `node_modules`.
- Allowlist documentada no topo do teste com referência ao bloco `%%` do `.mmd` para fácil manutenção.
- Mensagens de falha incluem o caminho do arquivo problemático e instrução: *"atualize TRILHA_MENSAGENS_NAVEGAVEL.mmd"*.

### Arquivos afetados

**Criar:**
- `src/test/fixtures/TRILHA_MENSAGENS_NAVEGAVEL.mmd` (cópia do diagrama)
- `src/test/realtimeFanout.test.ts`

**Não edita** código de produção nem o `.mmd` original em `/mnt/documents`.

### Fora de escopo

- Validar arestas de envio (composição, retry, DLQ) — só fan-out realtime.
- Validar outros diagramas (`MAPA_HOOKS_DEPENDENCIAS_NAVEGAVEL.mmd` etc.).
- Auto-corrigir o diagrama — só falha o teste com instrução clara.
- Cobrir consumidores de tabelas que não sejam `messages`.

