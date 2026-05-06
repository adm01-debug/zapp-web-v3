# ADR-008: Error Tracking & Monitoring Strategy

## Status
Proposto (Onda 2)

## Contexto
O sistema carece de rastreamento de erros centralizado, dificultando o diagnóstico de falhas em produção (ex: erros silenciosos em webhooks ou falhas de UI em dispositivos específicos).

## Decisões
1. **Sentry Integration**: Adotar Sentry para rastreamento de exceções no frontend e backend (edge functions).
2. **Source Maps**: Configurar o build (Vite) para gerar e subir source maps para o Sentry de forma segura (via CI secrets).
3. **Breadcrumbs**: Integrar o `logger.ts` para enviar breadcrumbs ao Sentry, permitindo ver os logs anteriores ao erro.
4. **Environment Tagging**: Marcar erros com tags `env` (dev/staging/prod) e `backend` (lovable/fatorx).

## Consequências
- Visibilidade total de bugs antes do usuário reportar.
- Redução drástica no MTTR (Mean Time To Recovery).
