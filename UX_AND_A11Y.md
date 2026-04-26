# UX_AND_A11Y.md — Fase 7 da auditoria

**Data:** 2026-04-26

## 0. Resumo
| Indicador | Valor | Status |
|---|---:|:--:|
| Arquivos com `aria-*` ou `role=` | 158 | ✅ Cobertura ampla |
| Cores hardcoded fora do design system (produção) | 3 | 🟡 cosmético |
| Cores hardcoded em testes | 7 | 🟢 OK (mocks) |
| Componentes `ErrorBoundary`/`Suspense` | 24 | ✅ |
| Componentes de empty state | 43 | ✅ Padrão `GenericEmptyState` |

## 1. Achados não-bloqueantes
- `src/pages/admin/AdminInboxSyncStatusPage.tsx` — `text-blue-500` em ícone de KPI. Trocar por `text-primary`.
- `src/components/monitoring/DLQPanel.tsx` (2 ocorrências) — `border-blue-500/40 text-blue-500` em Badge `retrying`. Trocar por token semântico (`text-info` ou `text-primary`).

Não são bugs visuais, apenas violação leve da regra "sem cores hardcoded". Movidos para roadmap pós-10/10 para evitar tocar em UI sem revisão visual completa (regra do system prompt: "When the user asks for a UI change, keep the work in frontend and presentation code").

## 2. Verificações que passaram
- ✅ Memória `features/accessibility/keyboard-navigation-and-compliance` — Vim-style + WCAG 2.1 AA já implementados.
- ✅ Memória `features/inbox/operational-and-ui-standards` — paridade com WhatsApp Web mantida.
- ✅ Memória `style/design-system-and-skins` — Corporate Blue + tripla proteção contra regressão de tema.
- ✅ Memória `architecture/ui/empty-state-standardization` — `GenericEmptyState` padronizado.
- ✅ `ErrorBoundary` global com retry + backoff (memo `architecture/resilience/error-recovery`).

## 3. Conclusão
- ✅ A11y: cobertura forte e padrões estabelecidos.
- 🟡 3 cores hardcoded em produção — não-bloqueante.
- ✅ Padrão de empty states e error boundaries respeitado.
