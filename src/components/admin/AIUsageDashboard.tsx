// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function AIUsageDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['ai-usage-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('created_at, action_type')
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      // Group by date and action type
      const grouped = (data || []).reduce((acc: any, curr: any) => {
        const date = new Date(curr.created_at).toLocaleDateString();
        if (!acc[date]) acc[date] = { date, total: 0 };
        acc[date].total += 1;
        return acc;
      }, {});

      return Object.values(grouped);
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Uso da IA ao Longo do Tempo</CardTitle>
        <CardDescription>Quantidade total de requisições processadas</CardDescription>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats || []}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value: any) => [value, 'Requisições']} />
            <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
