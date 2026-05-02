# Storage Buckets vs Tabelas - Guia de Referência

## Padrão de Nomenclatura

O Supabase usa `.from()` tanto para tabelas/views quanto para storage buckets.
A convenção adotada no ZAPP-WEB:

| Nome com Hífen (Storage Bucket) | Nome com Underscore (Tabela DB) | Descrição |
|---|---|---|
| `audio-memes` | `audio_memes` | Memes de áudio (bucket: arquivos / tabela: metadados) |
| `audio-messages` | `audio_messages` | Mensagens de áudio (bucket: arquivos) |
| `custom-emojis` | `custom_emojis` | Emojis customizados (bucket: imagens / tabela: metadados) |
| `team-chat-files` | `team_chat_files` | Arquivos do chat interno (bucket: uploads) |
| `whatsapp-media` | `whatsapp_media` | Mídia WhatsApp (bucket: fotos/vídeos/docs) |

## Como identificar no código

```typescript
// STORAGE BUCKET (hífen)
supabase.storage.from('audio-memes').upload(...)
supabase.storage.from('audio-memes').getPublicUrl(...)

// TABELA DO BANCO (underscore)
supabase.from('audio_memes').select('*')
supabase.from('audio_memes').insert({...})
```

## Regra de Ouro
- **Hífen** (`-`) = Storage Bucket (arquivos binários)
- **Underscore** (`_`) = Tabela PostgreSQL (dados estruturados)
