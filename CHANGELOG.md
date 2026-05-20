# 📜 Changelog — ZAPP WEB

## [2.0.1] - 2026-05-06
### Adicionado
- Schemas de validação **Zod** para contatos e boundaries.
- Coleta de **Web Vitals** integrada à observabilidade.
- Documentação de **Onboarding** e **Diagrama ER**.
- ADR-005, ADR-006 e ADR-008.
- Template de Pull Request e configuração de **Dependabot**.
- Lint-staged e Husky para pre-commit checks.
- Distributed tracing support no Sentry (tracePropagationTargets).

### Alterado
- Reforço de **Branch Protection** (proibindo console.log e limitando any).
- Logger centralizado agora envia breadcrumbs para o **Sentry**.
- TypeScript: Habilitado `noImplicitAny` (monitoramento de erros faseado).

### Corrigido
- Importação ausente de `web-vitals`.
- Tipagem inconsistente em formulários de catálogo e auth.
