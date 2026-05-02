# Storage Buckets vs Tabelas — Referência

O Supabase usa `.from()` tanto para tabelas/views quanto para Storage buckets.
Este documento documenta quais são Storage e quais são tabelas.

## Storage Buckets (nomes com hífen)

| Nome (hífen) | Tipo | Uso |
|---|---|---|
| `audio-memes` | Storage Bucket | Áudios de memes enviados no chat |
| `audio-messages` | Storage Bucket | Áudios de mensagens de voz |
| `custom-emojis` | Storage Bucket | Emojis customizados (imagens) |
| `team-chat-files` | Storage Bucket | Arquivos do chat interno |
| `whatsapp-media` | Storage Bucket | Mídias do WhatsApp |

## Tabelas Equivalentes (nomes com underscore)

| Nome (underscore) | Tipo | Uso |
|---|---|---|
| `audio_memes` | Tabela | Metadados dos áudios de memes |
| `custom_emojis` | Tabela | Metadados dos emojis customizados |

## Regra

- **Hífen** (`audio-memes`) = **Storage Bucket** (arquivos binários)
- **Underscore** (`audio_memes`) = **Tabela PostgreSQL** (metadados)
