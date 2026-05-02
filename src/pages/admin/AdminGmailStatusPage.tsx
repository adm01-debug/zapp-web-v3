import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertCircle, CheckCircle2, Clock, ShieldCheck, Database, 
  Search, RefreshCcw, AlertTriangle, ChevronLeft, ChevronRight,
  Filter, History as HistoryIcon
} from 'lucide-react';
import { useGmail } from '@/hooks/useGmail';
import { gmailHealthService, GmailHealthInfo, GmailFailure } from '@/services/gmailHealthService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminGmailStatusPage() {
  const { accounts, schemaStatus, lastRequestId } = useGmail();
  const [health, setHealth] = useState<GmailHealthInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    requestId: '',
    resource: '',
    operation: '',
    page: 1
  });
  const [failuresData, setFailuresData] = useState<{ items: GmailFailure[], total: number }>({ items: [], total: 0 });

  const loadHealth = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gmail-health', {
        headers: {
          'Content-Type': 'application/json'
        },
        body: {}, // Use body for params as queryParams isn't in type
        method: 'GET'
      });
      
      // Since type doesn't support queryParams, we'll construct URL manually for filters if needed, 
      // but for status we can just call basic invoke.
      // Re-invoking with full URL to support filters:
      const projectUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${projectUrl}/functions/v1/gmail-health?page=${filters.page}&pageSize=5${filters.requestId ? `&requestId=${filters.requestId}` : ''}${filters.resource ? `&resource=${filters.resource}` : ''}${filters.operation ? `&operation=${filters.operation}` : ''}`;
      
      const fetchResponse = await fetch(functionUrl, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      const dataFull = await fetchResponse.json();
      
      if (!fetchResponse.ok) throw new Error(dataFull.error || 'Erro na Edge Function');
      
      setHealth({
        status: dataFull.status as any,
        lastValidation: dataFull.last_validation ? new Date(dataFull.last_validation) : null,
        cacheExpiration: null,
        recentFailures: dataFull.failuresResult?.items || [],
        stats: {
          totalCalls: 0, 
          failedCalls: dataFull.failure_count_window || 0,
          cacheHits: 0
        }
      });
      setFailuresData(dataFull.failuresResult || { items: [], total: 0 });
    } catch (error) {
      console.error('Erro ao carregar saúde do Gmail:', error);
      toast.error('O serviço de telemetria do Gmail está indisponível.');
      
      try {
        const { data: summary } = await supabase
          .from('gmail_health_summary')
          .select('*')
          .eq('id', 'current')
          .maybeSingle();
          
        if (summary) {
          setHealth({
            status: summary.status as any,
            lastValidation: summary.last_validation ? new Date(summary.last_validation) : null,
            cacheExpiration: null,
            recentFailures: [],
            stats: { totalCalls: 0, failedCalls: summary.failure_count_60m, cacheHits: 0 }
          });
        }
      } catch (fallbackErr) {
        console.error('Fallback falhou:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
    const interval = setInterval(async () => {
      try {
        const projectUrl = import.meta.env.VITE_SUPABASE_URL;
        await fetch(`${projectUrl}/functions/v1/gmail-health?action=auto_check`, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          }
        });
      } catch (e) {
        console.warn('Auto-check falhou');
      }
    }, 300000);
    return () => clearInterval(interval);
  }, [filters]);

  const handleRevalidate = async () => {
    const revalidatePromise = async () => {
      const projectUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${projectUrl}/functions/v1/gmail-health?action=revalidate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      await gmailHealthService.forceRevalidation();
      return data;
    };

    toast.promise(revalidatePromise(), {
      loading: 'Agendando revalidação no backend...',
      success: 'Revalidação agendada com sucesso!',
      error: 'Erro ao solicitar revalidação'
    });
    
    setTimeout(loadHealth, 2000);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'degraded': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-destructive" />;
      default: return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'healthy': return 'Operacional';
      case 'degraded': return 'Degradado';
      case 'error': return 'Crítico';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Status do Gmail</h1>
          <p className="text-muted-foreground">Monitoramento de integridade do schema e conexões Gmail.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => window.location.hash = '#admin/gmail-audit'} variant="outline" className="gap-2">
            <History className="w-4 h-4" />
            Ver Auditoria
          </Button>
          <Button onClick={handleRevalidate} variant="outline" className="gap-2">
            <RefreshCcw className="w-4 h-4" />
            Forçar Revalidação
          </Button>
        </div>
      </div>

      {health?.status && health.status !== 'healthy' && (
        <Alert variant={health.status === 'error' ? 'destructive' : 'default'} className={health.status === 'degraded' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : ''}>
          {health.status === 'error' ? <AlertCircle className="h-4 h-4" /> : <AlertTriangle className="h-4 h-4" />}
          <AlertTitle>Status do Gmail: {getStatusLabel(health.status)}</AlertTitle>
          <AlertDescription>
            Foram detectadas {health.recentFailures.length} falhas recentes. 
            Verifique os logs abaixo usando o Request ID para depuração.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Saúde Geral</CardTitle>
            {getStatusIcon(health?.status)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getStatusLabel(health?.status)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {(health as any)?.source === 'edge_shared_storage' 
                ? 'Telemetria persistida via Cloud Edge.' 
                : 'Telemetria em tempo real (client-side).'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Última Validação</CardTitle>
            <Clock className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {health?.lastValidation ? new Date(health.lastValidation).toLocaleTimeString() : '--:--'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Próxima expiração cache: {health?.cacheExpiration ? new Date(health.cacheExpiration).toLocaleTimeString() : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Eficiência Cache</CardTitle>
            <ShieldCheck className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {health?.stats ? Math.round((health.stats.cacheHits / (health.stats.totalCalls || 1)) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {health?.stats?.cacheHits || 0} hits de {health?.stats?.totalCalls || 0} chamadas.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Contas Ativas</CardTitle>
            <Database className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {accounts.filter(a => a.is_active).length} operacionais.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Histórico de Falhas Operacionais
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">Total: {failuresData.total}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Request ID..." 
                  className="pl-9"
                  value={filters.requestId}
                  onChange={(e) => setFilters(prev => ({ ...prev, requestId: e.target.value, page: 1 }))}
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Recurso (gmail_...)" 
                  className="pl-9"
                  value={filters.resource}
                  onChange={(e) => setFilters(prev => ({ ...prev, resource: e.target.value, page: 1 }))}
                />
              </div>
              <div className="relative">
                <Database className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Operação (from/rpc)" 
                  className="pl-9"
                  value={filters.operation}
                  onChange={(e) => setFilters(prev => ({ ...prev, operation: e.target.value, page: 1 }))}
                />
              </div>
            </div>

            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Request ID</th>
                    <th className="px-4 py-2 text-left font-medium">Recurso</th>
                    <th className="px-4 py-2 text-left font-medium">Erro</th>
                    <th className="px-4 py-2 text-left font-medium">Horário</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {failuresData.items.length > 0 ? failuresData.items.map((failure, idx) => (
                    <tr key={`${failure.requestId}-${idx}`} className="hover:bg-muted/30">
                      <td className="px-4 py-2"><Badge variant="outline" className="font-mono">{failure.requestId}</Badge></td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{failure.resource}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{failure.operation}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-destructive max-w-[300px] truncate" title={failure.error}>
                        {failure.error}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {new Date(failure.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground italic">
                        Nenhuma falha encontrada com os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Mostrando {failuresData.items.length} de {failuresData.total} registros
              </p>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={filters.page === 1}
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">Página {filters.page}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={filters.page * 5 >= failuresData.total}
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
