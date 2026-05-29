-- ROLLBACK MANUAL da migração 20260529120100_harden_rls_replace_using_true.sql
-- NÃO fica em supabase/migrations/ de propósito (não deve auto-aplicar).
-- Rodar manualmente (psql/painel) APENAS se o endurecimento de RLS quebrar acesso em produção.
--
-- Efeito: remove as políticas criadas por aquela migração (sufixos _owner_access /
-- _auth_read / _staff_write) e reabre as tabelas afetadas com acesso permissivo
-- (USING true), restaurando o comportamento anterior. É um retorno ao estado INSEGURO —
-- use só como medida emergencial enquanto se corrige a política correta.

DO $$
DECLARE
  t record;
  pol record;
BEGIN
  FOR t IN
    SELECT DISTINCT c.relname AS table_name
    FROM pg_policy p
    JOIN pg_class c     ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND p.polname ~ '_(owner_access|auth_read|staff_write)$'
  LOOP
    FOR pol IN
      SELECT polname FROM pg_policy
      WHERE polrelid = format('public.%I', t.table_name)::regclass
        AND polname ~ '_(owner_access|auth_read|staff_write)$'
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I;', pol.polname, t.table_name);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %1$I_open_rollback ON public.%1$I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      t.table_name
    );
    RAISE NOTICE 'Rollback aplicado em public.%', t.table_name;
  END LOOP;
END $$;
