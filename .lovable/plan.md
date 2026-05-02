## Contexto verificado nesta análise

Confirmei nos dois backends (não estava documentado em nenhum lugar do código de forma centralizada):

- **Self-hosted (`externalClient` → `supabase.atomicabr.com.br`)** tem as tabelas reais: `evolution_messages`, `evolution_contacts`, `evolution_conversations`, `evolution_audit_log`. **Não tem `rpc_list_messages` deployada** (PGRST202). Acesso é via `.from('evolution_*')` direto.
- **Lovable Cloud (`supabase`)** tem `messages` e `contacts` (legado/duplicado) e **não tem** `conversations` nem `contact_audit_log`. É a fonte só para `auth`, `profiles`, `user_roles`, `queues`, `whatsapp_connections`.
- ~40 arquivos hoje fazem `supabase.from('messages'|'contacts'|'conversations')` apontando para o cliente errado — isso causa os erros de TS (tabela não existe nos types do Lovable Cloud) e dados vazios em runtime.

Também há um erro de runtime no preview (`gmailRefreshToken` não exportado em `src/hooks/gmail/gmailApi.ts`) que vou corrigir junto, sem alarde.

## Solução: registry + proxy fino

### 1. `src/integrations/datasource/registry.ts`

Mapa declarativo, fonte única da verdade:

```ts
export type LogicalEntity =
  | 'messages' | 'contacts' | 'conversations' | 'audit_log' | 'calls'
  | 'profiles' | 'user_roles' | 'queues' | 'whatsapp_connections';

export const ENTITY_MAP = {
  messages:             { client: 'external', table: 'evolution_messages' },
  contacts:             { client: 'external', table: 'evolution_contacts' },
  conversations:        { client: 'external', table: 'evolution_conversations' },
  audit_log:            { client: 'external', table: 'evolution_audit_log' },
  calls:                { client: 'external', table: 'evolution_calls' },
  profiles:             { client: 'lovable',  table: 'profiles' },
  user_roles:           { client: 'lovable',  table: 'user_roles' },
  queues:               { client: 'lovable',  table: 'queues' },
  whatsapp_connections: { client: 'lovable',  table: 'whatsapp_connections' },
} as const satisfies Record<LogicalEntity, { client: 'lovable' | 'external'; table: string }>;
```

### 2. `src/integrations/datasource/db.ts` — proxy fino

Helpers que devolvem o `SupabaseClient` correto e a query builder apontando para a tabela física certa:

```ts
import { supabase } from '@/integrations/supabase/client';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import { ENTITY_MAP, type LogicalEntity } from './registry';

export function dbClient(entity: LogicalEntity) {
  const target = ENTITY_MAP[entity].client === 'external' ? externalSupabase : supabase;
  if (!target) throw new Error(`[db] Cliente para "${entity}" não configurado`);
  return target;
}
export function dbFrom(entity: LogicalEntity) {
  return dbClient(entity).from(ENTITY_MAP[entity].table) as any;
}
export function dbChannel(entity: LogicalEntity, name: string) {
  return dbClient(entity).channel(`${name}:${ENTITY_MAP[entity].table}`);
}
export function dbTable(entity: LogicalEntity) { return ENTITY_MAP[entity].table; }
```

Tipo do retorno é `any` por enquanto (os types do `externalClient` não estão no `Database` do Lovable). Isso destrava o build sem mascarar erros — a regra é "se você importou de `@/integrations/datasource/db`, você assume a forma da linha".

### 3. Migrações de chamadas (Phase A — destravar build)

Ajusto os ~40 arquivos listados, padrão único:

- `supabase.from('messages').select(...)` → `dbFrom('messages').select(...)`
- `supabase.from('contacts').update(...)` → `dbFrom('contacts').update(...)`
- `supabase.from('conversations').select(...)` → `dbFrom('conversations').select(...)`
- `supabase.channel('msg').on('postgres_changes', { table: 'messages' }, ...)` → `dbChannel('messages','msg').on('postgres_changes', { table: dbTable('messages') }, ...)`

Casos especiais que já vi:

- `src/features/inbox/data-access/messageRepository.ts` e `useContactsRealtime.ts`: hoje fazem realtime contra Lovable Cloud. Vou trocar para `dbChannel('messages'|'contacts', ...)` + filtro pela coluna correta (`remote_jid` ou `contact_id` conforme schema do `evolution_*`).
- `useTeamProfiles.ts` (RPC `get_team_profiles` no Lovable): permanece em `supabase`, é tabela `profiles`, mapeamento já manda para `lovable`.
- `ContactConversationHistory.tsx`: hoje seleciona campos `last_message_preview`, `assigned_agent_name`, `message_count` que são do schema antigo. No `evolution_conversations` os campos equivalentes são outros — vou ajustar o select para `id, status, last_message_at, assigned_to, remote_jid` e adaptar a render. Sem RPC `rpc_list_conversations` no host, fica `.from('evolution_conversations').select(...).eq('contact_id', id)`.

### 4. Fix paralelo do erro de runtime

`useGmailOAuthFlow.ts` importa `gmailRefreshToken` de `./gmail/gmailApi` mas a função não existe lá. Vou adicionar a função (POST para a edge function `gmail-refresh-token` que já existe no projeto) seguindo o mesmo padrão das outras (`gmailRevokeAccount`, `gmailRegisterWatch`).

### 5. Lint guard (opcional, depois do build verde)

ESLint rule `no-restricted-syntax` que bane `supabase.from('messages'|'contacts'|'conversations'|'audit_log'|'calls')` direto, forçando uso do `dbFrom`. Adiciono comentado em `eslint.config.js` para você ativar quando quiser.

## Entregáveis desta rodada

1. `src/integrations/datasource/registry.ts` (novo)
2. `src/integrations/datasource/db.ts` (novo)
3. ~40 arquivos editados para usar `dbFrom`/`dbChannel` (lista exata acima — todos os que apareceram no `rg`)
4. `src/hooks/gmail/gmailApi.ts` ganha `gmailRefreshToken`
5. Documentação curta no topo do `registry.ts` explicando como adicionar uma nova entidade

## O que **não** faço agora (fora do escopo desta rodada)

- Não crio RPCs no self-hosted (você disse explicitamente que não está mais no FATOR X; se quiser as RPCs lá depois, é outra discussão).
- Não altero `evolution_*` schemas.
- Não migro nada do Lovable Cloud (`profiles`/`queues`/etc.).

Aprova para eu executar?
