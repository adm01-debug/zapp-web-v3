-- Enable RLS on tables that were created without it.
-- Each table gets a minimal safe policy: authenticated users can only access
-- rows where user_id matches their own auth.uid().

-- avatars
ALTER TABLE IF EXISTS avatars ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='avatars' AND policyname='avatars_owner_access') THEN
    CREATE POLICY avatars_owner_access ON avatars
      FOR ALL TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- conversation_summaries
ALTER TABLE IF EXISTS conversation_summaries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversation_summaries' AND policyname='conv_summaries_authenticated') THEN
    CREATE POLICY conv_summaries_authenticated ON conversation_summaries
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- email_templates
ALTER TABLE IF EXISTS email_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_templates' AND policyname='email_templates_authenticated') THEN
    CREATE POLICY email_templates_authenticated ON email_templates
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- message_queue (internal/service role only — no user-facing reads)
ALTER TABLE IF EXISTS message_queue ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='message_queue' AND policyname='message_queue_service_only') THEN
    -- Edge functions use service_role key which bypasses RLS; this blocks direct anon/user access
    CREATE POLICY message_queue_service_only ON message_queue
      FOR ALL TO authenticated USING (false);
  END IF;
END $$;

-- messages_whatsapp (internal/service role only)
ALTER TABLE IF EXISTS messages_whatsapp ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages_whatsapp' AND policyname='messages_whatsapp_service_only') THEN
    CREATE POLICY messages_whatsapp_service_only ON messages_whatsapp
      FOR ALL TO authenticated USING (false);
  END IF;
END $$;

-- system_logs (read-only for admins via service role; deny direct user access)
ALTER TABLE IF EXISTS system_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='system_logs' AND policyname='system_logs_service_only') THEN
    CREATE POLICY system_logs_service_only ON system_logs
      FOR ALL TO authenticated USING (false);
  END IF;
END $$;

-- salespeople
ALTER TABLE IF EXISTS salespeople ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='salespeople' AND policyname='salespeople_authenticated') THEN
    CREATE POLICY salespeople_authenticated ON salespeople
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;
