-- Corrige política RLS da tabela zapp.xp_transactions.
-- Bug: a política xp_own_select comparava profile_id com auth.uid() diretamente.
-- A coluna profile_id é UUID do schema zapp (profiles.id), não o UUID do auth.users.
-- A função zapp.get_profile_id_for_user() faz a resolução correta.
-- Sem essa correção, usuários não-admin recebem 0 linhas ao consultar seu próprio histórico XP.

DO $fix$
BEGIN
  -- Remove a política com a comparação errada
  DROP POLICY IF EXISTS xp_own_select ON zapp.xp_transactions;

  -- Recria com a comparação correta via função de resolução
  CREATE POLICY xp_own_select ON zapp.xp_transactions
    AS PERMISSIVE
    FOR SELECT
    TO authenticated
    USING (
      profile_id = zapp.get_profile_id_for_user(auth.uid())
      OR EXISTS (
        SELECT 1 FROM zapp.user_roles ur
        WHERE ur.profile_id = zapp.get_profile_id_for_user(auth.uid())
          AND ur.role IN ('admin', 'super_admin')
      )
    );

  RAISE NOTICE 'Política xp_own_select recriada com get_profile_id_for_user().';
EXCEPTION
  WHEN undefined_function THEN
    RAISE WARNING 'Função zapp.get_profile_id_for_user não encontrada — política não aplicada.';
  WHEN OTHERS THEN
    RAISE;
END $fix$;
