## Objetivo

Disparar **200 mensagens reais** para `64 98445-0900` (Joaquim) usando a edge function `evolution-api` chamada **diretamente do chat** (sem depender da UI). Cada envio é uma chamada `curl_edge_functions` que retorna sucesso/erro na hora.

## Como vai funcionar

- Em modo build, eu chamo `supabase--curl_edge_functions` no path `/evolution-api` com o payload de cada envio (texto, imagem, áudio, sticker, vídeo, documento, localização, áudio meme).
- Cada chamada eu **vejo a resposta** (messageId ou erro) imediatamente.
- Distribuição igual entre 8 tipos: 25 envios de cada → 200 total.
- Mídia vinda da biblioteca existente (`stickers`, `audio_memes`) + URLs públicas pequenas para imagem/vídeo/documento/voz.
- Política: **parar na 1ª falha** (sua escolha anterior).

## Estratégia de execução em lotes

Não consigo fazer 200 chamadas numa só resposta (limite de tool calls por turno). Vou em **lotes de ~20 envios por turno**, parando entre lotes para você confirmar que chegou no celular:

```text
Lote 1  (envios 1-10)   — smoke test: 1 de cada tipo + 2 textos extras
                          → você confirma recebimento no celular
Lote 2  (envios 11-30)  — escalada: 20 envios alternados
Lote 3  (envios 31-60)  — 30 envios
Lote 4  (envios 61-110) — 50 envios
Lote 5  (envios 111-160) — 50 envios
Lote 6  (envios 161-200) — 40 envios finais
```

Entre cada lote eu reporto:
- ✅ Quantos chegaram com sucesso (com `messageId`)
- ❌ Quantos falharam e o erro exato
- ⏱️ Latência média

## Intervalo entre envios

Como **eu** estou disparando (não um loop no browser), o intervalo é o tempo natural entre minhas tool calls (~1-3s cada). Isso já evita flood. Se chegar tudo muito rápido, adiciono `await sleep` artificial.

## Salvaguarda crítica

**Smoke test primeiro.** O Lote 1 envia só 10 mensagens (1 de cada tipo). Se nem o texto simples chegar no seu celular, paro tudo e investigo a edge function `evolution-api` antes de continuar. Só escalo se você confirmar "chegou".

## Detalhes técnicos

- Endpoint: `POST {SUPABASE_URL}/functions/v1/evolution-api`
- Headers: Authorization Bearer (token do usuário logado é injetado automaticamente pela tool)
- Payload por tipo:
  - `text`: `{ action: "sendText", instance: "wpp2", number: "5564984450900", text: "..." }`
  - `image/video/document`: `{ action: "sendMedia", mediatype, mimetype, media: <url>, ... }`
  - `audio` (voz/meme): `{ action: "sendWhatsAppAudio", audio: <url>, encoding: true }`
  - `sticker`: `{ action: "sendSticker", sticker: <url> }`
  - `location`: `{ action: "sendLocation", latitude, longitude, name }`
- Verifico assinatura real consultando `src/hooks/useEvolutionApi.ts` antes do Lote 1 (para garantir que o payload bate com o que a edge function espera).
- Cada sucesso registro num arquivo `/tmp/stress_results.jsonl` para você baixar o log no final.

## O que eu preciso de você

1. **Aprovar este plano.**
2. Manter o WhatsApp aberto no celular durante o Lote 1 para confirmar recebimento.
3. Após o Lote 1, me responder simplesmente "chegou" ou "não chegou X tipos".

Se chegar, eu sigo direto até os 200 sem precisar de mais aprovações.
