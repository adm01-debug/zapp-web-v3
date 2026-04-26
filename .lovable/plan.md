# Promover adm01@promobrindes.com.br a `dev`

## Estado atual
- User ID: `ccd47976-1a04-4722-8e59-87aeb09d748b`
- Papéis hoje: `{admin}`
- Enum `app_role` disponível: `admin, manager, supervisor, agent, special_agent, dev`

## Mudança
Adicionar o papel `dev` (mantém `admin` existente — `dev` é o nível mais alto da hierarquia segundo `mem://auth/roles-and-visibility`).

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('ccd47976-1a04-4722-8e59-87aeb09d748b', 'dev')
ON CONFLICT (user_id, role) DO NOTHING;
```

Aprove para eu sair do plan mode e executar a migração. Depois disso o usuário precisa fazer logout/login para o token refletir o novo papel.