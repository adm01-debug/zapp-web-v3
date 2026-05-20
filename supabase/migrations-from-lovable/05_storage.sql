-- ═══════════════════════════════════════════════════════════
-- 05_STORAGE: 9 buckets Lovable Cloud (apply UPSERT)
-- ═══════════════════════════════════════════════════════════
-- NOTA: Storage policies (RLS em storage.objects) precisam ser
-- aplicadas separadamente. Buckets criados aqui não terão policies
-- ainda — verifique 11_storage_policies.sql se existir.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('audio-memes', 'audio-memes', true, NULL, NULL) ON CONFLICT (id) DO UPDATE SET public=EXCLUDED.public, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('audio-messages', 'audio-messages', false, NULL, NULL) ON CONFLICT (id) DO UPDATE SET public=EXCLUDED.public, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('avatars', 'avatars', true, 5242880, '{image/jpeg,image/png,image/webp,image/gif}') ON CONFLICT (id) DO UPDATE SET public=EXCLUDED.public, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('custom-emojis', 'custom-emojis', true, 512000, '{image/png,image/webp,image/gif,image/jpeg,image/svg+xml}') ON CONFLICT (id) DO UPDATE SET public=EXCLUDED.public, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('email-attachments', 'email-attachments', false, NULL, NULL) ON CONFLICT (id) DO UPDATE SET public=EXCLUDED.public, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('quarantine', 'quarantine', false, NULL, NULL) ON CONFLICT (id) DO UPDATE SET public=EXCLUDED.public, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('stickers', 'stickers', true, NULL, NULL) ON CONFLICT (id) DO UPDATE SET public=EXCLUDED.public, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('team-chat-files', 'team-chat-files', false, NULL, NULL) ON CONFLICT (id) DO UPDATE SET public=EXCLUDED.public, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('whatsapp-media', 'whatsapp-media', false, NULL, NULL) ON CONFLICT (id) DO UPDATE SET public=EXCLUDED.public, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;
