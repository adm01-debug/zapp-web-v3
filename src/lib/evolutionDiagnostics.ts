import { whatsappConnectionRepository } from "@/features/connections/data-access/whatsappConnectionRepository";
import { isExternalConfigured } from "@/integrations/supabase/externalClient";

export interface DiagnosticResult {
  step: string;
  status: 'ok' | 'fail' | 'warn';
  message: string;
  details?: any;
}

export async function runEvolutionDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];

  // 1. Check if external Supabase is configured
  if (isExternalConfigured) {
    results.push({
      step: 'Configuração do Banco Externo',
      status: 'ok',
      message: 'URL e Anon Key do banco externo configurados.'
    });
  } else {
    results.push({
      step: 'Configuração do Banco Externo',
      status: 'fail',
      message: 'Configurações de banco externo (VITE_EXTERNAL_SUPABASE_URL) não encontradas.'
    });
  }

  // 2. Test Global API Key / Evolution Connectivity
  try {
    // Timeout extended for diagnostics check
    const { data, error } = await whatsappConnectionRepository.callEvolutionApi({
      action: 'list-instances'
    });

    if (error) {
      results.push({
        step: 'Evolution API (Connectivity)',
        status: 'fail',
        message: `Erro ao conectar na Evolution API: ${error.message}`,
        details: error
      });
    } else {
      results.push({
        step: 'Evolution API (Connectivity)',
        status: 'ok',
        message: 'Conectado com sucesso à Evolution API.',
        details: data
      });
      
      // 3. Test Permissions (if data exists)
      if (Array.isArray(data)) {
        results.push({
          step: 'Permissões da Evolution API',
          status: 'ok',
          message: `Permissão validada. ${data.length} instâncias encontradas.`
        });
      } else if (data?.message?.includes('Forbidden') || data?.status === 403) {
        results.push({
          step: 'Permissões da Evolution API',
          status: 'fail',
          message: 'A Global API Key não tem permissão para listar instâncias.'
        });
      }
    }
  } catch (err: any) {
    results.push({
      step: 'Evolution API (Critical)',
      status: 'fail',
      message: `Falha crítica de rede ou CORS: ${err.message}`
    });
  }

  return results;
}
