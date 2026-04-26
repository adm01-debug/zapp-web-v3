# Plano para consertar o chat do front

Encontrei a causa principal do bug: o Inbox principal ainda está preso no modo legado local, enquanto o projeto já migrou o WhatsApp/CRM para o backend canônico de mensagens.

Hoje o front do Inbox está usando:
- `useRealtimeInbox.ts` com `USE_EXTERNAL_DB = false`
- leitura/escrita em `public.messages` e `public.contacts`
- envio via `messageSender.ts` olhando `contacts/whatsapp_connections` locais

Mas a arquitetura atual do projeto diz que o chat real está em:
- `evolution_messages` / `evolution_conversations`
- leitura via proxy/RPC do FATOR X
- webhook canônico como fonte da verdade

Resultado: o front abre um chat “errado”, não acompanha as mensagens reais que chegam, e também tenta enviar pelo caminho antigo.

## O que vou corrigir

### 1) Trocar o Inbox para a fonte de dados correta
- Remover o hardcode legado em `src/hooks/useRealtimeInbox.ts`.
- Fazer a sidebar e o chat aberto consumirem a fonte externa como padrão.
- Parar de depender de `useRealtimeMessages` / `useMessages` para o Inbox principal.
- Usar o fluxo já existente para mensagens externas (`useExternalConversations` + cursor/realtime externo) como base oficial do chat.

### 2) Restaurar recebimento de mensagens no front
- Garantir que o chat aberto observe `evolution_messages` e/ou o cursor externo em vez da tabela local `messages`.
- Ajustar a atualização da conversa selecionada para refletir novas mensagens recebidas sem precisar recarregar manualmente.
- Validar o mapeamento de status/timestamps para que a bolha apareça no chat certo.

### 3) Restaurar envio pelo front no pipeline canônico
- Substituir o envio legado do Inbox por um sender compatível com o backend real.
- O envio do chat vai:
  - resolver o contato/instância pelo backend canônico,
  - chamar a função de envio correta,
  - registrar/espelhar a mensagem na fonte usada pelo Inbox,
  - reconciliar a bolha otimista quando o retorno/webhook confirmar.
- Corrigir também ações do input que ainda gravam direto em `supabase.from('messages')` no `ChatPanel`.

### 4) Preservar feedback visual do operador
- Manter o banner de erro/retry que já existe.
- Ligar o status inline e a timeline ao fluxo real de mensagens para que “queued/sent/delivered/read” reflitam o chat correto.
- Garantir que o chat continue mostrando a bolha imediatamente ao enviar, sem sumir ao refetch.

### 5) Fazer uma limpeza de regressões ligadas ao preview
- Corrigir o problema de CSS visto no dev-server (`@import must precede all other statements`) para evitar preview/HMR instável durante o teste.
- Revisar qualquer teste falso-positivo do chat: há indício de teste prometido anteriormente que nem existe no caminho esperado, então vou alinhar a cobertura com o fluxo real do Inbox.

## Validação que vou fazer depois da correção
- Abrir o Inbox principal.
- Confirmar que mensagens recebidas aparecem no front sem refresh manual.
- Enviar mensagem pelo campo do chat e verificar:
  - bolha aparece na hora,
  - status evolui no front,
  - mensagem chega no celular,
  - recarregar a tela não faz a mensagem sumir.
- Repetir com pelo menos texto e áudio, e revisar os outros atalhos do input que ainda usam o caminho antigo.

## Detalhes técnicos
- Arquivos principais a mexer:
  - `src/hooks/useRealtimeInbox.ts`
  - `src/hooks/useExternalEvolution.ts` e/ou `src/hooks/useMessagesCursor.ts`
  - `src/hooks/realtime/messageSender.ts` ou novo sender externo específico do Inbox
  - `src/components/inbox/ChatPanel.tsx`
  - `src/components/inbox/chat/useChatPanelHandlers.ts`
  - `src/index.css` se o erro de `@import` estiver quebrando o preview
- Não vou mexer no cliente auto-gerado de backend.
- A correção vai seguir a arquitetura já definida no projeto: Inbox usando o backend externo como fonte da verdade para WhatsApp/CRM.

Assim que você aprovar, eu aplico a correção direto no front e valido o fluxo real do chat.