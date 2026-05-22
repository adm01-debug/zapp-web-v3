// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function AIUsageUsersTab() {
  const { data: userData, isLoading } = useQuery({
    queryKey: ['ai-usage-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('user_id, profiles(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userCounts = (data || []).reduce((acc: any, curr: any) => {
        const userName = curr.profiles?.name || 'Desconhecido';
        if (!acc[userName]) acc[userName] = { name: userName, value: 0 };
        acc[userName].value += 1;
        return acc;
      }, {});

      return Object.values(userCounts);
    }
  });

  if (isLoading) return <Skeleton className="h-[400px] w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por Usuário</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={userData || []}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {(userData || []).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: any) => [value, 'Uso']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
