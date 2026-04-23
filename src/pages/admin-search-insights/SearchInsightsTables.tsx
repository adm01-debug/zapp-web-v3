import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GenericEmptyState } from '@/components/ui/GenericEmptyState';
import { Search, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { SearchInsights } from '@/hooks/useSearchInsights';

interface Props { data: SearchInsights; }

function safeDate(iso: string) {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR }); }
  catch { return '—'; }
}

export function SearchInsightsTables({ data }: Props) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="h-4 w-4" /> Top queries
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.top_queries.length === 0 ? (
            <GenericEmptyState
              icon={Search}
              title="Sem queries no período"
              description="Nenhuma busca registrada na janela selecionada."
              className="py-8"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Query</TableHead>
                  <TableHead className="text-right">Buscas</TableHead>
                  <TableHead className="text-right">Méd. resultados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.top_queries.slice(0, 20).map((q) => (
                  <TableRow key={q.query}>
                    <TableCell className="font-mono text-xs max-w-[280px] truncate" title={q.query}>{q.query}</TableCell>
                    <TableCell className="text-right tabular-nums">{q.count}</TableCell>
                    <TableCell className="text-right tabular-nums">{q.avg_results.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Queries sem resultado
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.zero_result_queries.length === 0 ? (
            <GenericEmptyState
              icon={AlertCircle}
              title="Nenhuma query zero-result"
              description="Todas as buscas no período retornaram pelo menos um resultado."
              className="py-8"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Query</TableHead>
                  <TableHead className="text-right">Tentativas</TableHead>
                  <TableHead className="text-right">Última</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.zero_result_queries.slice(0, 20).map((q) => (
                  <TableRow key={q.query}>
                    <TableCell className="font-mono text-xs max-w-[280px] truncate" title={q.query}>{q.query}</TableCell>
                    <TableCell className="text-right tabular-nums">{q.count}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{safeDate(q.last_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
