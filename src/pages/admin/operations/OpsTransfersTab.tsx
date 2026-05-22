// @ts-nocheck
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { AlertTriangle, Clock, TrendingUp } from "lucide-react";

type SlaRow = {
  department: string | null;
  instance_name: string;
  display_name: string | null;
  total_tickets: number;
  pending: number;
  escalated: number;
  expired: number;
  avg_wait_min: number | null;
};

export function OpsTransfersTab() {
  const [rows, setRows] = useState<SlaRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("v_admin_sla_dashboard" as never)
          .select("*");
        if (error) throw error;
        if (active) setRows((data ?? []) as SlaRow[]);
      } catch (err) {
        log.error("OpsTransfersTab load failed", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) return <Skeleton className="h-96" />;

  const totals = rows.reduce(
    (acc, r) => ({
      pending: acc.pending + Number(r.pending ?? 0),
      escalated: acc.escalated + Number(r.escalated ?? 0),
      expired: acc.expired + Number(r.expired ?? 0),
    }),
    { pending: 0, escalated: 0, expired: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Escalados</CardTitle>
            <TrendingUp className="h-4 w-4 text-warning-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.escalated}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">SLA Estourado</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{totals.expired}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SLAs por Instância</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4">Departamento</th>
                  <th className="py-2 pr-4">Instância</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Pendentes</th>
                  <th className="py-2 pr-4">Escalados</th>
                  <th className="py-2 pr-4">Expirados</th>
                  <th className="py-2 pr-4">Espera Média</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      Nenhuma transferência registrada.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.instance_name} className="border-b hover:bg-muted/40">
                      <td className="py-2 pr-4">{r.department ?? "—"}</td>
                      <td className="py-2 pr-4 font-medium">{r.display_name ?? r.instance_name}</td>
                      <td className="py-2 pr-4">{r.total_tickets}</td>
                      <td className="py-2 pr-4">{r.pending}</td>
                      <td className="py-2 pr-4">
                        {Number(r.escalated) > 0 ? (
                          <Badge variant="secondary">{r.escalated}</Badge>
                        ) : (
                          r.escalated
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {Number(r.expired) > 0 ? (
                          <Badge variant="destructive">{r.expired}</Badge>
                        ) : (
                          r.expired
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {r.avg_wait_min ? `${Number(r.avg_wait_min).toFixed(1)} min` : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
