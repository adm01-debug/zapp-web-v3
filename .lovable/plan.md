# Destravar o preview — corrigir build TypeScript

## O que está acontecendo

O preview abre, mas a tela fica branca. Não é mais o HTTP 412 — agora é o **Vite recusando a compilar** por causa de 5 erros de tipo do Supabase. Sem build, nada renderiza.

A causa é a mesma em todos: o cliente Supabase usa um tipo estrito (`RejectExcessProperties`) para `update()` e `insert()`. Passar um objeto genérico (`Record<string, unknown>`, `Record<string, any>`, ou `{ [field]: value }` com chave dinâmica) é tratado como "propriedade não-conhecida da tabela" e bloqueia a compilação. Não é bug do schema — é só uma anotação de tipo faltando.

## Arquivos e correções

```text
1. src/components/contacts/ContactMergeDialog.tsx (linha 57)
   merged: Record<string, unknown>   →   merged: Database['public']['Tables']['contacts']['Update']
   .update(merged)                   →   .update(merged as never)  (alternativa simples)

2. src/components/contacts/ContactMergePanel.tsx (linha 80)
   mergedData: Record<string, any>   →   tipar como ContactsUpdate
   .update(mergedData)               →   passa tipado

3. src/components/contacts/InlineEditCell.tsx (linha 33)
   .update({ [field]: editValue || null })
     → .update({ [field]: editValue || null } as Database['public']['Tables']['contacts']['Update'])

4. src/components/inbox/contact-details/ContactInfoSection.tsx (linha 107)
   .update({ [field]: value })
     → mesmo cast da linha acima

5. src/hooks/useGeoBlocking.ts (linha 71)
   .from(table).insert({ country_code, country_name, [userField]: user?.id })
     → o problema é que `table` é union ('allowed_countries' | 'blocked_countries') e o
       objeto literal não satisfaz nenhum dos dois schemas isoladamente.
     Solução: separar em dois branches if/else, um por tabela, com objetos
     literais concretos. Sem cast, código mais legível.
```

## Abordagem

Para 1–4 (updates de `contacts` com chaves dinâmicas), o caminho mais limpo é importar o tipo da tabela e tipar o objeto antes do `.update()`:

```ts
import type { Database } from '@/integrations/supabase/types';
type ContactsUpdate = Database['public']['Tables']['contacts']['Update'];

const merged: ContactsUpdate = {};
// ...
await supabase.from('contacts').update(merged).eq('id', primary.id);
```

Para 5 (insert em tabela union), refatorar pra dois inserts dedicados, um por aba (`whitelist` → `allowed_countries`, `blacklist` → `blocked_countries`). Mais verboso, mas o TS valida cada um corretamente.

## Resultado esperado

- Build passa, preview deixa de ser tela branca.
- Banner de 412 (já implementado) continua disponível como rede de segurança.
- Zero mudança de comportamento — só anotações de tipo e refator local em `useGeoBlocking`.
- Plano de auto-reconexão do `wpp2` (ainda pendente) pode ser retomado em seguida.
