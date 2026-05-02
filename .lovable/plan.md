# Plano: destravar o preview agora + mapeamento de origem depois

## Causa real da tela branca

O log do Vite mostra, repetidamente:

```
Failed to resolve import "dompurify" from "src/lib/sanitize.ts"
```

`dompurify` é importado em `src/lib/sanitize.ts` e `src/components/contacts/SafeHtml.tsx`, mas **não está em `package.json`**. Como `sanitize.ts` é usado em dezenas de arquivos do Inbox/Contatos (MessageBubble, AuditLogPanel, ContactConversationHistory, etc.), todo o bundle quebra → tela branca.

Isto é independente do tema "qual Supabase tem messages/contacts". O refactor de roteamento não vai destravar o preview enquanto essa dependência estiver faltando.

## Proposta em 2 fases

### Fase 1 — Destravar o preview (5 min, 2 arquivos)

1. `bun add dompurify @types/dompurify` — adiciona a dependência que o `sanitize.ts` já consome.
2. Verificar no log do Vite que o erro `Failed to resolve import "dompurify"` desaparece e a tela carrega.
3. Abrir o preview e confirmar visualmente que o Inbox renderiza (mesmo que algumas chamadas de dados ainda falhem com 404/erro de RLS — isso é o tema da Fase 2, não bloqueia a renderização).

Se sobrarem erros de runtime (não de bundle) depois de instalar `dompurify`, eu diagnostico um a um — provavelmente serão chamadas a tabelas inexistentes no Lovable Cloud, o que liga direto na Fase 2.

### Fase 2 — Mapeamento único de origem por entidade (depois)

Só faz sentido começar depois que o preview voltar a renderizar, porque sem isso eu não tenho como validar nenhum refactor.

A ideia é a que descrevi antes:

- `src/integrations/datasource/registry.ts` — mapa declarativo: `messages → selfhosted (rpc_list_messages)`, `contacts → selfhosted (rpc_get_contact)`, `whatsapp_connections → lovable`, etc.
- `src/integrations/datasource/db.ts` — proxy `db.list / getOne / insert / channel` que escolhe `supabase` vs `externalSupabase` e RPC vs `.from()` automaticamente lendo o registry.
- Migração incremental dos ~130 arquivos que hoje chamam `supabase.from('messages'|'contacts'|'conversations'|...)` direto.
- Lint rule final para impedir regressão.

Mas todo esse desenho depende de validação rodando — então só começo depois que a Fase 1 estiver verde.

## O que preciso de você

Aprovação para a Fase 1 (instalar `dompurify` + `@types/dompurify` e abrir o preview para conferir). Depois disso, retomamos o desenho do registry com o app rodando para testar cada migração.
