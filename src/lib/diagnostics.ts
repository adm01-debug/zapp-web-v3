import { supabase } from "@/integrations/supabase/client";

/**
 * Rotina de Verificação Automatizada: Fluxo de Conexão
 * 
 * Este script valida:
 * 1. A conectividade com o endpoint do Supabase Self-Hosted.
 * 2. A persistência de dados na tabela system_connections.
 * 3. A integridade do RLS (se o registro é visível após o save).
 */
export async function runConnectionDiagnostics() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    steps: []
  };

  const log = (step: string, status: 'pass' | 'fail', details: any) => {
    diagnostics.steps.push({ step, status, details });
    console.log(`[Diagnostics] ${status.toUpperCase()}: ${step}`, details);
  };

  try {
    // Passo 1: Verificar Autenticação Local
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      log('Auth Check', 'fail', 'Usuário não autenticado no Lovable Cloud.');
      return diagnostics;
    }
    log('Auth Check', 'pass', { user: session.user.email });

    // Passo 2: Testar Conectividade Externa (Self-Hosted)
    const externalUrl = 'https://supabase.atomicabr.com.br';
    const externalKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.rvamc0XHuSCYB1glBwOCCxgfd9yxWVYLnhFzg5-7TRk';
    
    try {
      const res = await fetch(`${externalUrl}/rest/v1/?apikey=${encodeURIComponent(externalKey)}`, {
        headers: { apikey: externalKey, Authorization: `Bearer ${externalKey}` },
      });
      if (res.ok) {
        log('External Connectivity', 'pass', { status: res.status });
      } else {
        log('External Connectivity', 'fail', { status: res.status, msg: 'Endpoint não respondeu com sucesso' });
      }
    } catch (e: any) {
      log('External Connectivity', 'fail', { error: e.message });
    }

    // Passo 3: Testar Persistência no system_connections (Simulação de Save)
    const testName = `DIAG_TEST_${Math.floor(Math.random() * 1000)}`;
    const { data: saveResult, error: saveError } = await supabase
      .from('system_connections' as any)
      .upsert({
        name: testName,
        provider: 'supabase_external',
        config: { url: externalUrl, anon_key: 'HIDDEN_IN_LOGS' },
        is_active: true,
        created_by: session.user.id
      }, { onConflict: 'name' })
      .select();

    if (saveError) {
      log('Database Persistence', 'fail', { error: saveError });
    } else {
      log('Database Persistence', 'pass', { id: saveResult?.[0]?.id });

      // Passo 4: Verificação de Visibilidade (Read-back)
      const { data: verify, error: verifyError } = await supabase
        .from('system_connections' as any)
        .select('*')
        .eq('name', testName)
        .maybeSingle();

      if (verifyError || !verify) {
        log('Data Visibility (RLS)', 'fail', { error: verifyError?.message || 'Registro não encontrado após save' });
      } else {
        log('Data Visibility (RLS)', 'pass', { verified_id: verify.id });
        
        // Limpeza opcional (apenas se for ambiente de teste)
        await supabase.from('system_connections' as any).delete().eq('name', testName);
      }
    }

  } catch (e: any) {
    log('Global Error', 'fail', { message: e.message });
  }

  return diagnostics;
}
