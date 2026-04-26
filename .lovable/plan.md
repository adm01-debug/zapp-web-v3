## Objetivo
Fazer o Inbox voltar a enviar pelo front, pela própria interface, usando o backend real do WhatsApp/CRM que já está funcionando por trás. O problema hoje não é a API de envio em si; é o front estar preso em um fluxo legado e desalinhado da fonte de verdade.

## Diagnóstico confirmado
- O Inbox principal ainda está preso no fluxo legado local em vez do fluxo real de WhatsApp/CRM.
- Em `src/hooks/useRealtimeInbox.ts`, a flag `USE_EXTERNAL_DB = false` deixa a interface lendo e enviando pelo caminho antigo.
- Em `src/hooks/realtime/messageSender.ts`, o envio ainda grava em tabelas locais (`messages`, `contacts`, `whatsapp_connections`) e depois tenta disparar a API.
- A memória do projeto diz o contrário: o Inbox deveria estar 100% no backend externo de WhatsApp/CRM, com webhook como fonte da verdade.
- Em `src/components/inbox/chat/useChatPanelHandlers.ts`, o `onSendMessage` é tratado como síncrono; o handler não espera a promessa do envio terminar, então o estado de envio/erro no input pode ficar incoerente.

## Plano de correção
1. **Alinhar o Inbox à fonte de verdade**
   - Ativar o modo externo no `useRealtimeInbox`.
   - Fazer a conversa aberta e a lista lateral usarem o fluxo do backend real de WhatsApp/CRM de forma consistente.
   - Garantir que o chat visível, os dados carregados e o envio usem a mesma identidade de conversa.

2. **Trocar o sender legado pelo sender real do Inbox**
   - Substituir o fluxo de `messageSender.ts` baseado em tabelas locais por um fluxo compatível com o backend real.
   - Resolver contato/conversa pelo backend correto.
   - Enviar texto/mídia/áudio/sticker/localização pelo mesmo pipeline do front.
   - Persistir/reconciliar a mensagem no histórico correto para ela aparecer imediatamente na interface e depois confirmar pelo webhook/realtime.

3. **Unificar os envios especiais do chat**
   - Revisar `useChatMediaSending.ts` para sticker, emoji e áudio meme.
   - Fazer esses envios usarem o mesmo backend real e o mesmo padrão de reconciliação do chat principal.
   - Eliminar casos em que a mídia “vai” mas a interface não reflete, ou vice-versa.

4. **Corrigir o comportamento do input e feedback visual**
   - Tornar `onSendMessage` assíncrono no `useChatPanelHandlers` e aguardar o envio de verdade.
   - Ajustar `isSending`, erro, retry e restauração de texto para refletirem o resultado real.
   - Preservar feedback claro no botão de envio e na bolha da mensagem.

5. **Validar no preview pelo front**
   - Testar envio manual pela interface, não por automação de backend isolada.
   - Confirmar: clique no botão, request do front, mensagem aparecendo no chat e entrega no celular.
   - Começar com poucos envios reais pela interface para validar o conserto antes de qualquer carga maior.

## Arquivos mais prováveis de ajuste
- `src/hooks/useRealtimeInbox.ts`
- `src/hooks/realtime/messageSender.ts`
- `src/components/inbox/chat/useChatPanelHandlers.ts`
- `src/components/inbox/useChatMediaSending.ts`
- `src/hooks/useExternalEvolution.ts`
- possivelmente `src/components/inbox/RealtimeInboxView.tsx` e adaptadores de mensagem

## Detalhes técnicos
- O front hoje mistura dois mundos: UI de Inbox apontando para um caminho legado local, enquanto o tráfego real de WhatsApp/CRM já está em outro backend.
- O conserto principal é eliminar essa divergência: leitura, envio, realtime e reconciliação precisam usar o mesmo pipeline.
- Também vou revisar a configuração do cliente do backend externo para garantir que o Inbox esteja falando com a base correta do domínio WhatsApp/CRM.
- A validação final será feita com envio pelo próprio chat da interface, porque esse é exatamente o comportamento quebrado que precisa ser corrigido.