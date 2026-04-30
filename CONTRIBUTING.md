# Guia de Contribuição

> Padrão de trabalho da Promo Brindes. Aplica-se a todo este repositório.

## 🎯 Princípio

**Toda alteração em `main` passa por Pull Request.** Sem exceção. Mesmo configs.

Razão: rastreabilidade + revisão automática (CodeRabbit) + ponto de gate antes de deploy.

## 🔄 Fluxo de trabalho

1. **Criar branch** a partir de `main`:
   ```bash
   git checkout main
   git pull
   git checkout -b <tipo>/<descricao-curta>
   ```

2. **Tipos de branch** (prefixo obrigatório):
   - `feat/` — funcionalidade nova
   - `fix/` — correção de bug
   - `chore/` — manutenção, deps, configs
   - `docs/` — documentação
   - `refactor/` — refatoração sem mudança de comportamento
   - `hotfix/` — correção urgente em produção

3. **Commits** seguindo Conventional Commits:
   ```
   <tipo>(<escopo opcional>): descrição curta

   Corpo opcional explicando o porquê.

   Refs: #issue
   ```
   Exemplos:
   - `feat(bitrix): adiciona sync de contatos para SPA Lalamove`
   - `fix(edge-function): corrige timeout em webhook-evolution`
   - `chore(deps): atualiza @supabase/supabase-js para 2.39.0`

4. **Abrir Pull Request** com base em `main`.
   - Preencher o template
   - Aguardar revisão automática do **CodeRabbit** (~3 min)
   - Endereçar comentários críticos
   - Solicitar aprovação humana se mudança não-trivial

5. **Merge** somente após:
   - ✅ CodeRabbit revisou
   - ✅ Comentários críticos / security resolvidos
   - ✅ CI passou (se aplicável)
   - ✅ Aprovação humana (para mudanças em produção)

## 🚫 Proibido

- `git push --force` em `main`
- Commit direto em `main` (use sempre PR)
- Commitar `.env`, tokens, chaves SSH ou qualquer credencial
- Merge sem revisão do CodeRabbit
- Renomear ou deletar tabelas/colunas Supabase sem backup `_backup_*_YYYYMMDD`

## 🔐 Secrets

- **Nunca** commitar tokens, credenciais ou URLs com auth embutida
- Usar `Deno.env.get()` em Edge Functions
- Usar `process.env` (com validação) em Node.js
- Configurar via dashboard Supabase, n8n credentials ou GitHub Secrets

## 🧪 Antes de abrir PR

Checklist mínimo:
- [ ] Código roda local (ou justifica por que não dá pra testar local)
- [ ] Sem `console.log` esquecidos com payloads sensíveis
- [ ] Migrations SQL com backup das tabelas afetadas
- [ ] Variáveis de ambiente documentadas se forem novas

## 🎓 Convenções específicas

### Edge Functions Supabase
- Sempre usar `Deno.env.get('NOME')` para secrets
- Idempotência via `idempotency_key` em operações sensíveis
- CORS via `_shared/validation.ts`

### Migrations Supabase
- Backup obrigatório antes de DROP: `CREATE TABLE _backup_<nome>_YYYYMMDD AS SELECT * FROM <nome>;`
- RLS policies em todas as tabelas novas
- `SECURITY DEFINER` em RPCs requer `SET search_path = ''`

### Bitrix24
- Ownership: `T<entityTypeId-hex>` (ex: `T5c2` para 1474)
- OAuth credential n8n: `oEUYsInMBZbNlMoI`
- Webhook clássico `ipkwbb32nhewia33` está **INVÁLIDO** — não usar

## ⏱️ SLAs de Review e Resposta a Incidentes

### Review de Pull Requests

| Tipo de PR | Primeiro retorno (CodeRabbit) | Aprovação humana | Responsável |
|------------|-------------------------------|------------------|-------------|
| `docs`, `chore` baixo risco | até **5 min** (auto) | até **1 dia útil** | Pink |
| `feat`, `refactor`, `perf` | até **5 min** (auto) | até **2 dias úteis** | Pink |
| `fix` crítico / `hotfix` | até **5 min** (auto) | até **8h úteis** | Pink (on-call) |

### Incidentes em Produção

| Severidade | Exemplo | Reconhecimento | Mitigação inicial | Atualização |
|-----------|---------|----------------|-------------------|-------------|
| **SEV-1** | indisponibilidade total, perda de receita | até **15 min** | até **30 min** | a cada **30 min** |
| **SEV-2** | degradação relevante, falha em fluxo principal | até **30 min** | até **2h** | a cada **1h** |
| **SEV-3** | erro parcial com workaround | até **4h úteis** | até **1 dia útil** | 1×/dia |

- Todo incidente SEV-1/2 deve gerar postmortem em até **3 dias úteis** após resolução.
- Postmortems publicados em `docs/postmortems/AAAA-MM-DD-titulo.md`.

## 🚒 Procedimento de Hotfix

Hotfix é reservado para correções urgentes em produção (normalmente SEV-1/SEV-2).

### Passo a passo

1. **Abrir incidente** com classificação de severidade (SEV-1/2/3) na issue tracker.
2. **Criar branch `hotfix/<descricao-curta>`** a partir de `main`.
3. **Implementar correção mínima segura** + teste direcionado ao defeito (não refatorar nada além do necessário).
4. **Abrir PR `hotfix/*` para `main`** com label `hotfix` e link do incidente.
5. **Aguardar revisão CodeRabbit** + aprovação humana expressa.
6. **Validar** build, lint, typecheck, testes críticos antes do merge.
7. **Deploy em produção** com janela comunicada (Slack / WhatsApp dos stakeholders).
8. **Monitorar 60 min** pós-deploy: logs, métricas (Sentry/GlitchTip), erros.
9. **Encerrar incidente** com resumo técnico + impacto.
10. **Postmortem** em até 3 dias úteis (o que aconteceu, o que falhou, o que melhorar).

### Critérios de saída

- [ ] Métrica/erro que disparou o incidente voltou ao patamar normal por **60 min**
- [ ] Sem regressões em fluxos críticos monitorados
- [ ] Comunicação final enviada para stakeholders
- [ ] Postmortem agendado/publicado

## 🔄 Cadência de Dependências e Segurança

| Rotina | Cadência | Entregável |
|--------|----------|------------|
| Updates npm (minor/patch via Dependabot) | **semanal (segunda)** | PRs `chore(deps)` agrupadas |
| Revisão de vulnerabilidades (`npm audit` + GitHub Security) | **semanal (segunda)** | Triagem na tracking issue de security |
| Updates de dependências críticas (major) | **mensal (1ª semana)** | PR dedicado com plano de migração |
| Validação de secrets e configs sensíveis | **mensal** | Checklist de segurança atualizado |

- Dependências com CVE **alta/crítica** devem ter plano de correção em até **48h**.
- Se não houver patch, abrir exceção temporária documentada com mitigação.

## 📣 Release Notes por Ciclo

Ao final de cada ciclo (sprint ou release), publicar release notes para stakeholders não técnicos.

### Conteúdo mínimo

1. **Resumo executivo** — o que mudou e por quê
2. **Impacto operacional** — times/processos afetados
3. **Riscos conhecidos** + mitigação
4. **Incidentes relevantes** do ciclo (se houver)
5. **Pendências e próximos passos**

### Prazo e canais

- Publicar em até **1 dia útil** após o encerramento do ciclo
- Canais: e-mail para stakeholders + `docs/CHANGELOG.md` interno
