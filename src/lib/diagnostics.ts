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

    // Passo 2: Buscar Configuração Atual no Banco
    const { data: currentConfigs, error: fetchError } = await supabase
      .from('system_connections' as any)
      .select('*')
      .eq('name', 'FATOR X')
      .eq('provider', 'supabase_external')
      .maybeSingle();

    if (fetchError || !currentConfigs) {
      log('Fetch Current Config', 'fail', 'Configuração "FATOR X" não encontrada em system_connections.');
      return diagnostics;
    }
    
    const configData = currentConfigs as any;
    const externalUrl = configData.config?.url;
    const externalKey = configData.config?.anon_key;

    if (!externalUrl || !externalKey) {
      log('Config Validation', 'fail', 'URL ou Anon Key ausentes na configuração do banco.');
      return diagnostics;
    }
    log('Config Validation', 'pass', { url: externalUrl, key_length: externalKey.length });

    // Passo 3: Testar Conectividade Externa (Self-Hosted)
    try {
      const res = await fetch(`${externalUrl.replace(/\/$/, '')}/rest/v1/?apikey=${encodeURIComponent(externalKey)}`, {
        headers: { apikey: externalKey, Authorization: `Bearer ${externalKey}` },
      });
      if (res.status < 500) {
        log('External Connectivity', 'pass', { status: res.status });
      } else {
        log('External Connectivity', 'fail', { status: res.status, msg: 'Endpoint retornou erro 500+' });
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
      const savedData = saveResult as any[];
      log('Database Persistence', 'pass', { id: savedData?.[0]?.id });

      // Passo 4: Verificação de Visibilidade (Read-back)
      const { data: verify, error: verifyError } = await supabase
        .from('system_connections' as any)
        .select('*')
        .eq('name', testName)
        .maybeSingle();

      const verifyData = verify as any;

      if (verifyError || !verifyData) {
        log('Data Visibility (RLS)', 'fail', { error: verifyError?.message || 'Registro não encontrado após save' });
      } else {
        log('Data Visibility (RLS)', 'pass', { verified_id: verifyData.id });
        
        // Limpeza opcional
        await supabase.from('system_connections' as any).delete().eq('name', testName);
      }
    }

  } catch (e: any) {
    log('Global Error', 'fail', { message: e.message });
  }

  return diagnostics;
}
