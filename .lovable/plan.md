# Corrigir HTTP 412 no Preview

## Diagnóstico

O HTTP ERROR 412 que aparece ao abrir o preview **não vem do código do app**. Vem do `lovable.js`, o proxy de fetch que o iframe do preview injeta para algumas rotas (notadamente `/auth/v1/token` do Supabase). Confirmado por:

- Não há override de `window.fetch` no código (`grep` em `src/` e `public/` limpo).
- `supabase/client.ts` está intacto (auto-gerado).
- O endpoint `/auth/v1/token` é exatamente o que o stack-overflow knowledge da Lovable lista como afetado.
- A app **funciona normalmente na URL publicada** (`https://pronto-talk-suite.lovable.app` e `https://zappweb.app.br`).

Ou seja: não há "fix de código" que elimine o 412 dentro do iframe do preview — é infraestrutura. O que dá pra fazer é blindar o app para que **nunca trave numa tela em branco** quando uma chamada inicial recebe 412 transiente.

## O que vamos mudar

### 1. `src/hooks/useAuth.tsx` — robustez no boot

- Detectar especificamente erros tipo `412 / Precondition Failed / Failed to fetch` em `getSession()` e em `signIn`.
- Quando detectar 412 transiente: **fazer 1 retry com backoff curto (800ms)** antes de dar up. Hoje a falha de `getSession()` já limpa tokens e segue como deslogado, mas se o 412 acontece **durante o login**, o usuário fica preso.
- No `signIn`, capturar `error.message` contendo "412" / "Failed to fetch" / "Precondition" e retornar uma mensagem amigável: *"Falha temporária do preview. Tente novamente em alguns segundos ou abra a versão publicada."*

### 2. `src/components/auth/` — banner discreto no preview

Mostrar um banner pequeno **somente quando o host é `*.lovable.app` (preview, não publicado)** e detectarmos um 412 recente, com botão "Recarregar" e link para a URL publicada. Some sozinho após sucesso. Em produção (`zappweb.app.br`) nunca aparece.

### 3. `src/main.tsx` — handler global de 412

No `unhandledrejection` listener já existente, identificar mensagens de erro de fetch com 412 e:
- evitar o log barulhento (downgrade pra `info`),
- disparar um `CustomEvent('preview-precondition-error')` que o banner do passo 2 escuta.

### 4. Não vamos mexer

- `client.ts` (auto-gerado, proibido).
- `vite.config.ts` (irrelevante — o 412 é do runtime do iframe).
- Service worker (`public/sw.js`) — já limpa caches legados; nenhuma relação com 412.
- Headers/CORS (warning explícito da knowledge: *"Do not attempt to add CORS headers"*).

## Detalhes técnicos

```text
Boot flow após mudança:
 useAuth.useEffect()
   └─ getSession()
        ├─ ok            → segue normal
        ├─ 412/network   → wait 800ms → retry 1×
        │                    ├─ ok    → segue normal
        │                    └─ falha → limpa sb-* tokens, loading=false (igual hoje)
        └─ outro erro    → limpa sb-* tokens, loading=false (igual hoje)
```

```text
Banner (apenas preview):
 [🟡 Preview instável: requisição bloqueada pelo proxy do iframe]
 [ Recarregar ]  [ Abrir versão publicada ↗ ]
```

## Arquivos afetados

- `src/hooks/useAuth.tsx` — adicionar retry de 1 tentativa em `getSession()` e tratamento amigável em `signIn`.
- `src/components/auth/PreviewPreconditionBanner.tsx` (NOVO) — banner condicional ao host.
- `src/App.tsx` ou `src/components/AppShell.tsx` — montar o banner no topo.
- `src/main.tsx` — listener de `unhandledrejection` filtrando 412.

## Resultado esperado

- App **nunca fica em tela branca** por causa de 412 do iframe.
- Usuário no preview recebe feedback claro e atalho para a versão publicada.
- Zero impacto em produção (banner some, retry só dispara em falha real).
- Login continua passando normalmente assim que o proxy do preview liberar a request.
