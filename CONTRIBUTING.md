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
- [ ] Sem secrets hardcoded
- [ ] Migrations SQL com backup das tabelas afetadas
- [ ] Variáveis de ambiente documentadas se forem novas

## 🎓 Convenções específicas

### Edge Functions Supabase
- Sempre validar payload de webhook (assinatura HMAC ou shared secret)
- Sempre retornar JSON estruturado em erros
- Nunca vazar mensagem de erro com detalhes internos para o cliente

### Migrations Supabase
- Operações destrutivas isoladas em migrations próprias
- Backup antes de DROP em tabela `_backup_<original>_YYYYMMDD`
- RLS ON em qualquer tabela nova

### Bitrix24
- `crm.item.get` com `entityTypeId=4` para Smart Companies (não usar `crm.company.get`)
- OAuth2 sempre — webhook clássico está deprecado para nosso uso
