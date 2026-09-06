-- Migration: políticas RLS explícitas para tabelas com enable=true mas zero policies
-- Auditoria 22D 2026-09-05 identificou 3 tabelas deny-all-implícito → tornando explícito
-- e adicionando policies corretas de acordo com o modelo de acesso de cada tabela.

-- ─── zapp.invites ─────────────────────────────────────────────────────────────
-- Modelo de acesso: admin cria convites (via RPC invite_user que usa security definer);
-- usuário anônimo valida o token dele (via RPC accept_invite, security definer).
-- Acesso direto à tabela: somente admins autenticados lêem; escrita apenas via RPC.

CREATE POLICY "invites_admin_select" ON zapp.invites
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM zapp.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'superadmin')
    )
  );

-- INSERT/UPDATE/DELETE são feitos exclusivamente pelas funções SECURITY DEFINER
-- (invite_user, accept_invite). Sem policy → deny-all via RLS para DML direto.

-- ─── zapp.xp_transactions ─────────────────────────────────────────────────────
-- Modelo de acesso: ledger imutável de XP. Usuário vê próprias transações;
-- admin vê todas. Escrita apenas via RPC grant_xp (SECURITY DEFINER).

CREATE POLICY "xp_transactions_own_select" ON zapp.xp_transactions
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "xp_transactions_admin_select" ON zapp.xp_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM zapp.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'superadmin')
    )
  );

-- DML direto bloqueado (escrita apenas via grant_xp SECURITY DEFINER).

-- ─── zapp.license_heartbeat_log ───────────────────────────────────────────────
-- Modelo de acesso: escrita por cron (service_role); leitura por ops/admin.
-- Service_role bypassa RLS; para authenticated: somente admins.

CREATE POLICY "license_heartbeat_admin_select" ON zapp.license_heartbeat_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM zapp.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'superadmin')
    )
  );

-- Deny-all explícito para DML via authenticated (service_role bypassa RLS).
