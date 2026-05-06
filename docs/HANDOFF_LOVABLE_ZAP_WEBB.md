# 📋 HANDOFF TÉCNICO PARA O LOVABLE — Zap Webb Frontend

> **Objetivo:** Este documento explica EXATAMENTE como o frontend Zap Webb deve se conectar ao backend para funcionar como um CRM WhatsApp completo.
>
> **Regra #1:** O frontend se conecta ao **Supabase** para LEITURA de dados e ao **Evolution API** para ENVIO de mensagens.
>
> **Data:** 06/05/2026 | **Produto:** Zap Webb | **Empresa:** Promo Brindes

---

## 🎯 RESUMO EXECUTIVO

O Zap Webb é um CRM WhatsApp multi-atendente. O frontend precisa de DUAS conexões:

| Conexão | URL | Para quê |
|---------|-----|----------|
| **Supabase** (leitura + Realtime) | `https://supabase.atomicabr.com.br` | Ler contatos, conversas, mensagens, receber updates em tempo real |
| **Evolution API** (escrita) | `https://evolution.atomicabr.com.br` | Enviar mensagens, mídia, status de leitura |

---

## 🔐 CREDENCIAIS DE CONEXÃO

### Supabase (PostgREST + Realtime)

```
SUPABASE_URL=https://supabase.atomicabr.com.br
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.rvamc0XHuSCYB1glBwOCCxgfd9yxWVYLnhFzg5-7TRk
```

### Evolution API (envio de mensagens)

```
EVOLUTION_API_URL=https://evolution.atomicabr.com.br
EVOLUTION_API_KEY=429683C4C977415CAAFCCE10F7D57E11
INSTANCE_NAME=wpp2  (instância principal de produção)
```

---

## 📊 ARQUITETURA — O que o Lovable precisa saber

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Lovable)                     │
│                                                           │
│  LEITURA (Supabase Client JS):                           │
│    • Listar conversas    → GET /evolution_conversations   │
│    • Carregar mensagens  → GET /evolution_messages        │
│    • Buscar contatos     → GET /evolution_contacts        │
│    • Realtime WebSocket  → subscribe() em 3 tabelas      │
│                                                           │
│  ESCRITA (HTTP para Evolution API):                      │
│    • Enviar texto        → POST /message/sendText        │
│    • Enviar imagem       → POST /message/sendMedia       │
│    • Enviar áudio        → POST /message/sendWhatsAppAudio│
│    • Marcar como lido    → PUT /chat/markChatUnread      │
│                                                           │
│  MÍDIA (Cloudflare R2 via proxy):                        │
│    • Imagens/Áudios/Docs → https://zapp-media-proxy      │
│                              .adm01.workers.dev/...      │
└─────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐         ┌──────────────────┐
│   SUPABASE      │         │  EVOLUTION API    │
│  (PostgreSQL    │         │  (Baileys/WA)     │
│   + Realtime)   │         │                   │
│                 │         │  Envia mensagem    │
│ Lê/subscribe   │         │  via WhatsApp      │
│ dados          │         │  Web protocol      │
└─────────────────┘         └──────────────────┘
```

---

## 📖 PARTE 1: LEITURA DE DADOS (Supabase)

### Conexão inicial (JavaScript/TypeScript)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://supabase.atomicabr.com.br',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.rvamc0XHuSCYB1glBwOCCxgfd9yxWVYLnhFzg5-7TRk'
)
```

---

### 1.1 — Listar conversas (sidebar esquerda)

A sidebar do CRM mostra a lista de conversas. Cada conversa tem o nome do contato, última mensagem, contador de não-lidas e timestamp.

```typescript
// Buscar conversas com dados do contato
const { data: conversations } = await supabase
  .from('evolution_conversations')
  .select(`
    id,
    remote_jid,
    contact_id,
    status,
    unread_count,
    last_message_content,
    last_message_type,
    last_message_at,
    last_inbound_at,
    assigned_to,
    priority,
    instance_name,
    evolution_contacts (
      id,
      push_name,
      full_name,
      phone_number,
      profile_picture_url,
      lead_status,
      company,
      tags
    )
  `)
  .eq('instance_name', 'wpp2')        // filtra por instância
  .eq('status', 'aberta')              // só conversas abertas
  .order('last_message_at', { ascending: false })
  .limit(50)
```

**Campos importantes da conversa:**

| Campo | Tipo | Uso no frontend |
|-------|------|-----------------|
| `unread_count` | integer | Badge de não-lidas na sidebar |
| `last_message_content` | text | Preview da última mensagem (truncado) |
| `last_message_type` | text | "conversation", "audioMessage", "imageMessage" — exibir ícone |
| `last_message_at` | timestamp | Ordenação da lista + "há 5 min" |
| `last_inbound_at` | timestamp | Última msg recebida do cliente |
| `assigned_to` | varchar | Vendedor/atendente responsável |
| `status` | varchar | "aberta" ou "arquivada" |
| `priority` | varchar | "normal", "alta", "urgente" |

---

### 1.2 — Carregar mensagens de uma conversa (painel central)

Quando o atendente clica numa conversa, carrega as mensagens:

```typescript
// Carregar mensagens de uma conversa específica
const { data: messages } = await supabase
  .from('evolution_messages')
  .select(`
    id,
    message_id,
    remote_jid,
    from_me,
    message_type,
    content,
    media_url,
    media_mimetype,
    media_type,
    caption,
    quoted_message_id,
    status,
    push_name,
    created_at,
    deleted_at,
    edited_at
  `)
  .eq('instance_name', 'wpp2')
  .eq('remote_jid', '5562998001001@s.whatsapp.net')  // JID do contato
  .is('deleted_at', null)                             // ignorar deletadas
  .order('created_at', { ascending: false })
  .limit(50)                                          // últimas 50 msgs
```

**Campos importantes da mensagem:**

| Campo | Tipo | Uso no frontend |
|-------|------|-----------------|
| `from_me` | boolean | true = enviada pela empresa, false = recebida do cliente |
| `message_type` | varchar | Tipo: "conversation" (texto), "audioMessage", "imageMessage", "videoMessage", "documentMessage", "stickerMessage" |
| `content` | text | Texto da mensagem (vazio para mídia) |
| `media_url` | text | URL pública da mídia no proxy Cloudflare |
| `media_mimetype` | text | "image/jpeg", "audio/ogg; codecs=opus", "video/mp4", etc. |
| `caption` | text | Legenda de imagem/vídeo |
| `quoted_message_id` | text | Se for resposta a outra msg, o ID da msg citada |
| `status` | varchar | Status de entrega: "sent", "delivered", "read" |
| `deleted_at` | timestamp | Se não null, mensagem foi apagada (mostrar "Mensagem apagada") |
| `created_at` | timestamp | Timestamp da mensagem |

---

### 1.3 — Renderização de mídia por tipo

O frontend precisa renderizar cada tipo de mensagem de forma diferente:

```typescript
function renderMessage(msg) {
  switch (msg.message_type) {
    case 'conversation':
    case 'text':
    case 'extendedTextMessage':
      // Renderizar como bolha de texto
      return <TextBubble text={msg.content} />

    case 'audioMessage':
    case 'audio':
      // Player de áudio
      // media_url é a URL pública do proxy
      return <AudioPlayer src={msg.media_url} />

    case 'imageMessage':
    case 'image':
      // Exibir imagem com lightbox
      return <ImageMessage src={msg.media_url} caption={msg.caption} />

    case 'videoMessage':
    case 'video':
      // Player de vídeo
      return <VideoPlayer src={msg.media_url} caption={msg.caption} />

    case 'documentMessage':
    case 'document':
      // Link para download
      return <DocumentLink url={msg.media_url} name={msg.media_filename}
               mime={msg.media_mimetype} />

    case 'stickerMessage':
    case 'sticker':
      // Imagem sem fundo
      return <StickerImage src={msg.media_url} />

    case 'reaction':
      // Emoji de reação (não renderizar como bolha)
      return null // ou mostrar no canto da msg referenciada
  }
}
```

**IMPORTANTE sobre media_url:**
- URLs de mídia são servidas por `https://zapp-media-proxy.adm01.workers.dev/...`
- Formatos: `.ogg` (áudio), `.jpg/.jpeg/.png` (imagem), `.mp4` (vídeo), `.webp` (sticker)
- Se `media_url IS NULL` para mídia → mostrar spinner "Carregando..." (o worker ainda está fazendo download)
- Quando `media_url` for preenchida, o Realtime emitirá um UPDATE — substituir spinner pelo player

---

### 1.4 — Buscar contatos (painel direito)

```typescript
// Buscar contato por telefone ou nome
const { data: contacts } = await supabase
  .from('evolution_contacts')
  .select('id, push_name, full_name, first_name, last_name, phone_number, email, company, lead_status, lead_score, tags, profile_picture_url')
  .or('push_name.ilike.%maria%,phone_number.ilike.%62998%,full_name.ilike.%maria%')
  .limit(20)
```

---

### 1.5 — Zerar unread_count ao abrir conversa

Quando o atendente abre uma conversa, zerar o contador de não-lidas:

```typescript
await supabase
  .from('evolution_conversations')
  .update({ unread_count: 0 })
  .eq('id', conversationId)
```

---

## 📡 PARTE 2: REALTIME (WebSocket)

O Supabase Realtime permite receber mudanças em tempo real via WebSocket. O frontend PRECISA se inscrever em 3 canais:

### 2.1 — Novas mensagens

```typescript
// Inscrever para receber novas mensagens em tempo real
const messagesChannel = supabase
  .channel('messages-realtime')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'evolution_messages',
    filter: 'instance_name=eq.wpp2'
  }, (payload) => {
    const newMsg = payload.new
    // Adicionar mensagem no chat se a conversa está aberta
    // Ou incrementar unread na sidebar se não está
    addMessageToChat(newMsg)
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'evolution_messages',
    filter: 'instance_name=eq.wpp2'
  }, (payload) => {
    const updatedMsg = payload.new
    // UPDATE acontece quando:
    // 1. media_url é preenchida (substituir spinner por player)
    // 2. status muda (sent → delivered → read)
    // 3. mensagem é deletada (deleted_at preenchido)
    updateMessageInChat(updatedMsg)
  })
  .subscribe()
```

### 2.2 — Atualizações de conversas

```typescript
const conversationsChannel = supabase
  .channel('conversations-realtime')
  .on('postgres_changes', {
    event: '*',  // INSERT, UPDATE
    schema: 'public',
    table: 'evolution_conversations',
    filter: 'instance_name=eq.wpp2'
  }, (payload) => {
    // INSERT = nova conversa → adicionar na sidebar
    // UPDATE = unread_count++, last_message atualizado → atualizar sidebar
    updateConversationInSidebar(payload.new)
  })
  .subscribe()
```

### 2.3 — Novos contatos

```typescript
const contactsChannel = supabase
  .channel('contacts-realtime')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'evolution_contacts'
  }, (payload) => {
    // Novo contato ou push_name atualizado
    updateContactInfo(payload.new)
  })
  .subscribe()
```

### Tabelas publicadas no Realtime (16)

O Supabase Realtime está configurado para publicar mudanças nestas tabelas:

| Tabela | Eventos úteis para o frontend |
|--------|-------------------------------|
| `evolution_messages` | Nova msg (INSERT), media_url preenchida (UPDATE), msg deletada (UPDATE) |
| `evolution_conversations` | Nova conversa (INSERT), unread++ (UPDATE), status (UPDATE) |
| `evolution_contacts` | Novo contato (INSERT), push_name atualizado (UPDATE) |
| `evolution_labels` | Etiquetas criadas/alteradas |
| `evolution_label_associations` | Etiqueta vinculada a conversa |
| `evolution_reactions` | Reação a mensagem |
| `evolution_alerts` | Alertas do sistema (conexão caiu, etc.) |
| `evolution_calls` | Chamadas recebidas |
| `evolution_whatsapp_status` | Status/Stories recebidos |
| `media_security_alerts` | Alertas de segurança (arquivo bloqueado) |

**IMPORTANTE: pubviaroot=true** — Os INSERTs/UPDATEs nas partições (ex: `evolution_messages_wpp2`) são publicados como se fossem da tabela-pai (`evolution_messages`). O frontend se inscreve na tabela-pai e recebe eventos de todas as instâncias.

---

## ✉️ PARTE 3: ENVIO DE MENSAGENS (Evolution API)

Para ENVIAR mensagens, o frontend chama a Evolution API diretamente via HTTP:

### 3.1 — Enviar mensagem de texto

```typescript
const response = await fetch(
  'https://evolution.atomicabr.com.br/message/sendText/wpp2',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': '429683C4C977415CAAFCCE10F7D57E11'
    },
    body: JSON.stringify({
      number: '5562998001001',    // telefone SEM @s.whatsapp.net
      text: 'Olá! Tudo bem?'
    })
  }
)
```

### 3.2 — Enviar imagem

```typescript
await fetch('https://evolution.atomicabr.com.br/message/sendMedia/wpp2', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'apikey': '429683C4C977415CAAFCCE10F7D57E11' },
  body: JSON.stringify({
    number: '5562998001001',
    mediatype: 'image',
    media: 'https://url-da-imagem.com/foto.jpg',  // URL pública da imagem
    caption: 'Segue a foto do produto'              // legenda (opcional)
  })
})
```

### 3.3 — Enviar áudio (PTT voice note)

```typescript
await fetch('https://evolution.atomicabr.com.br/message/sendWhatsAppAudio/wpp2', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'apikey': '429683C4C977415CAAFCCE10F7D57E11' },
  body: JSON.stringify({
    number: '5562998001001',
    audio: 'https://url-do-audio.com/audio.ogg'  // URL pública do áudio
  })
})
```

### 3.4 — Enviar documento

```typescript
await fetch('https://evolution.atomicabr.com.br/message/sendMedia/wpp2', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'apikey': '429683C4C977415CAAFCCE10F7D57E11' },
  body: JSON.stringify({
    number: '5562998001001',
    mediatype: 'document',
    media: 'https://url-do-doc.com/proposta.pdf',
    caption: 'Proposta comercial',
    fileName: 'proposta_promo_brindes.pdf'
  })
})
```

### 3.5 — Marcar conversa como lida

```typescript
await fetch('https://evolution.atomicabr.com.br/chat/markChatUnread/wpp2', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', 'apikey': '429683C4C977415CAAFCCE10F7D57E11' },
  body: JSON.stringify({
    number: '5562998001001',
    unread: false  // false = marcar como lida
  })
})
```

---

## 🔑 PARTE 4: PADRÃO DE URL DE MÍDIA

Todas as mídias são servidas por um Cloudflare Worker (proxy):

```
https://zapp-media-proxy.adm01.workers.dev/{instance}/{messageId}.{ext}
```

Exemplos reais:
- Imagem: `https://zapp-media-proxy.adm01.workers.dev/wpp2/3EB0A1B2C3D4.jpg`
- Áudio: `https://zapp-media-proxy.adm01.workers.dev/wpp2/3EB0E5F6G7H8.ogg`
- Vídeo: `https://zapp-media-proxy.adm01.workers.dev/wpp2/3EB0I9J0K1L2.mp4`
- Sticker: `https://zapp-media-proxy.adm01.workers.dev/wpp2/3EB0M3N4O5P6.webp`

**O campo `media_url` na tabela `evolution_messages` JÁ contém a URL completa do proxy.** O frontend só precisa usar diretamente.

---

## 🏗️ PARTE 5: SCHEMA DAS 3 TABELAS PRINCIPAIS

### evolution_contacts (43 colunas) — NÃO particionada

| Coluna | Tipo | Uso no frontend |
|--------|------|-----------------|
| `id` | UUID PK | Identificador interno |
| `remote_jid` | VARCHAR NOT NULL | ID WhatsApp (ex: `5562998001001@s.whatsapp.net`) |
| `phone_number` | VARCHAR | Telefone extraído (ex: `5562998001001`) |
| `push_name` | VARCHAR | Nome que o cliente colocou no WhatsApp |
| `full_name` | VARCHAR | Nome completo (auto-gerado de first_name + last_name) |
| `first_name` | VARCHAR | Primeiro nome (editável pelo atendente) |
| `last_name` | VARCHAR | Sobrenome (editável pelo atendente) |
| `nickname` | VARCHAR | Apelido (editável pelo atendente) |
| `email` | VARCHAR | Email do contato |
| `company` | VARCHAR | Empresa |
| `role_title` | VARCHAR | Cargo |
| `lead_status` | VARCHAR DEFAULT 'novo' | Pipeline: novo → qualificado → em_negociacao → cliente / perdido |
| `lead_score` | INTEGER DEFAULT 0 | Score de 0 a 100 |
| `assigned_to` | VARCHAR | Vendedor/atendente responsável |
| `tags` | TEXT[] | Tags/etiquetas |
| `profile_picture_url` | TEXT | URL da foto de perfil WhatsApp |
| `total_messages` | INTEGER | Total de mensagens trocadas |
| `notes` | TEXT | Anotações internas do atendente |

### evolution_conversations (29 colunas) — Particionada por instance_name (24 partições)

| Coluna | Tipo | Uso no frontend |
|--------|------|-----------------|
| `id` | UUID PK | Identificador da conversa |
| `contact_id` | UUID FK → contacts | Vínculo com contato |
| `remote_jid` | VARCHAR NOT NULL | JID do WhatsApp |
| `status` | VARCHAR | "aberta" ou "arquivada" |
| `unread_count` | INTEGER | Badge de não-lidas |
| `last_message_content` | TEXT | Preview da última msg (sidebar) |
| `last_message_type` | TEXT | Tipo da última msg (ícone na sidebar) |
| `last_message_at` | TIMESTAMP | Ordenação da sidebar |
| `assigned_to` | VARCHAR | Atendente responsável |
| `department` | VARCHAR | Setor (comercial, suporte, etc.) |
| `priority` | VARCHAR | "normal", "alta", "urgente" |
| `is_bot_active` | BOOLEAN | Se bot está ativo na conversa |
| `instance_name` | VARCHAR NOT NULL | Instância WhatsApp (ex: wpp2) |

### evolution_messages (40 colunas) — Particionada por instance_name (24 partições)

| Coluna | Tipo | Uso no frontend |
|--------|------|-----------------|
| `id` | UUID PK | Identificador interno |
| `message_id` | TEXT | ID original do WhatsApp (ex: `3EB0A1B2C3D4`) |
| `remote_jid` | TEXT NOT NULL | JID do contato |
| `from_me` | BOOLEAN | true=enviada, false=recebida |
| `message_type` | VARCHAR | Tipo: conversation, audioMessage, imageMessage, etc. |
| `content` | TEXT | Texto da msg (vazio para mídia) |
| `media_url` | TEXT | URL pública da mídia |
| `media_mimetype` | TEXT | Tipo MIME da mídia |
| `media_type` | TEXT | "image", "audio", "video", "document", "sticker" |
| `caption` | TEXT | Legenda de imagem/vídeo |
| `quoted_message_id` | TEXT | ID da msg citada (reply) |
| `status` | VARCHAR | "sent", "delivered", "read" |
| `contact_id` | UUID FK | Vínculo com contato |
| `conversation_id` | UUID FK | Vínculo com conversa |
| `created_at` | TIMESTAMP | Timestamp da msg |
| `deleted_at` | TIMESTAMP | Se não null, msg apagada |
| `instance_name` | VARCHAR NOT NULL | Instância (filtra partição) |

---

## ⚡ PARTE 6: FLUXO COMPLETO DE UMA MENSAGEM

### Mensagem RECEBIDA do cliente:

```
1. Cliente envia msg no WhatsApp
2. Evolution API recebe via Baileys WebSocket
3. Publica no RabbitMQ
4. Consumer Python envia para Supabase via Edge Function
5. fn_process_whatsapp_message cria/atualiza:
   - Contact (UPSERT)
   - Conversation (UPSERT, unread_count++)
   - Message (INSERT)
6. Supabase Realtime emite 3 eventos WebSocket:
   - INSERT evolution_contacts (se novo)
   - INSERT/UPDATE evolution_conversations
   - INSERT evolution_messages
7. Frontend recebe via subscribe() e renderiza
```

**Tempo total: ~260ms do WhatsApp até a tela do atendente.**

### Mensagem ENVIADA pelo atendente:

```
1. Atendente digita texto e clica enviar
2. Frontend faz POST para Evolution API (/message/sendText)
3. Evolution API envia via Baileys → WhatsApp
4. WhatsApp entrega ao destinatário
5. Evolution API recebe confirmação (sent → delivered → read)
6. Pipeline volta pelo mesmo caminho (RabbitMQ → Consumer → Supabase)
7. Realtime emite UPDATE (status: delivered, read)
8. Frontend atualiza checkmarks (✓ ✓)
```

---

## 🚫 PARTE 7: O QUE O FRONTEND NÃO FAZ

| Ação | NÃO fazer | Motivo |
|------|-----------|--------|
| Conectar no PG14 da Evolution API | ❌ | Banco interno, não acessível |
| Fazer INSERT direto em evolution_messages | ❌ | Mensagens são criadas pela pipeline (fn_process) |
| Baixar mídia do CDN do WhatsApp | ❌ | Usar media_url do proxy |
| Fazer HMAC signing | ❌ | Isso é feito pelo Consumer Python |
| Acessar RabbitMQ | ❌ | Infraestrutura interna |

---

## 📱 PARTE 8: INSTÂNCIAS WHATSAPP

O sistema suporta múltiplas instâncias (números de WhatsApp). A instância ativa principal é `wpp2`.

| Instância | Uso | Msgs |
|-----------|-----|------|
| `wpp2` | Produção principal | 1.829.484 |
| `wpp_pink_test` | Testes | 6.751 |
| `comercial_01..15` | Vendedores individuais (preparado) | — |
| `compras` | Setor compras | — |
| `financeiro` | Setor financeiro | — |
| `logistica` | Setor logística | — |
| `marketing` | Setor marketing | — |

**SEMPRE filtrar por `instance_name`** nas queries para evitar misturar dados de instâncias diferentes.

---

## 🎨 PARTE 9: TELAS QUE O FRONTEND PRECISA

### Tela 1 — Chat Principal (3 painéis)

```
┌──────────────┬──────────────────────────────┬────────────────┐
│   SIDEBAR    │         CHAT                  │   CONTATO      │
│              │                                │                │
│ [🔍 Busca]  │  ┌─────────────────────┐       │ 📷 Foto       │
│              │  │ Msg recebida       │       │ Maria Souza    │
│ Maria    (3) │  │ "Boa tarde!"       │       │ 62 99800-1001  │
│ João     (1) │  └─────────────────────┘       │                │
│ Ana      (0) │                                │ Lead: novo     │
│ Pedro    (0) │  ┌─────────────────────┐       │ Score: 45      │
│              │  │ Msg enviada (✓✓)   │       │ Tags: [VIP]    │
│              │  │ "Olá Maria!"       │       │                │
│              │  └─────────────────────┘       │ [📝 Notas]    │
│              │                                │ [🏷️ Tags]     │
│              │  ┌─────────────────────┐       │ [📊 Pipeline]  │
│              │  │ 🎵 Audio player   │       │                │
│              │  │ ▶ ──●───── 0:15   │       │                │
│              │  └─────────────────────┘       │                │
│              │                                │                │
│              │  ┌──────────────────────────┐  │                │
│              │  │ 📎 💬 [Digite aqui...] 🎤│  │                │
│              │  └──────────────────────────┘  │                │
└──────────────┴──────────────────────────────┴────────────────┘
```

### Tela 2 — Contatos / CRM

Lista de contatos com filtros por lead_status, assigned_to, tags.

### Tela 3 — Dashboard / Métricas

Contadores: conversas abertas, não-lidas, tempo resposta, etc.

---

*Handoff gerado em 06/05/2026 — Zap Webb v2.0 — Promo Brindes*
