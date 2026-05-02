import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock, ShieldCheck, Database } from 'lucide-react';
import { useGmail } from '@/hooks/useGmail';

export default function AdminGmailStatusPage() {
  const { accounts, schemaStatus, lastRequestId } = useGmail();

  const getStatusIcon = (ok: boolean) => {
    return ok ? (
      <CheckCircle2 className="w-5 h-5 text-green-500" />
    ) : (
      <AlertCircle className="w-5 h-5 text-destructive" />
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Status do Gmail</h1>
        <p className="text-muted-foreground">Monitoramento de integridade do schema e conexões Gmail.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Saúde do Schema</CardTitle>
            {getStatusIcon(schemaStatus.ok)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schemaStatus.ok ? 'Operacional' : 'Erro de Schema'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {schemaStatus.ok 
                ? 'Tabelas e RPCs gmail_* validadas.' 
                : 'Alguns recursos do Gmail estão ausentes no banco.'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Cache TTL</CardTitle>
            <Clock className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5 Minutos</div>
            <p className="text-xs text-muted-foreground mt-1">
              Última validação: {schemaStatus.lastChecked ? schemaStatus.lastChecked.toLocaleTimeString() : 'Nunca'}
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
              Conexões sincronizadas via Edge Functions.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Logs de Segurança e Telemetria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Último Request ID (Operacional)</span>
                <Badge variant="outline" className="font-mono">{lastRequestId || 'Nenhum recente'}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Este ID pode ser usado por desenvolvedores para rastrear falhas específicas no console com dados mascarados.
              </p>
            </div>

            {!schemaStatus.ok && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-semibold text-sm">Falha detectada no Schema</span>
                </div>
                <p className="text-xs">
                  O `safeClient` detectou que tabelas `gmail_*` ou RPCs necessárias não existem no schema público. 
                  Verifique se as migrations foram aplicadas corretamente.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contas Gmail Conectadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">E-mail</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Expiração Token</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {accounts.length > 0 ? accounts.map(acc => (
                  <tr key={acc.id}>
                    <td className="px-4 py-2">{acc.email}</td>
                    <td className="px-4 py-2">
                      <Badge variant={acc.is_active ? "default" : "secondary"}>
                        {acc.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {acc.token_expiry ? new Date(acc.token_expiry).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhuma conta Gmail configurada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
