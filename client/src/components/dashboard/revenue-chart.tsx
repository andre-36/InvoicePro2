import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface RevenueData {
  dates: string[];
  revenue: number[];
  expenses: number[];
  profit: number[];
}

interface RevenueChartProps {
  startDate?: string;
  endDate?: string;
}

export function RevenueChart({ startDate, endDate }: RevenueChartProps) {
  const { data, isLoading, error } = useQuery<RevenueData>({
    queryKey: ['/api/stores/1/dashboard/revenue', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);
      
      const response = await fetch(`/api/stores/1/dashboard/revenue?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch revenue data');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card className="lg:col-span-2">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-5">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-[288px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="lg:col-span-2">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Overview</h3>
          </div>
          <div className="flex justify-center items-center h-[288px]">
            <p className="text-gray-500">Failed to load revenue data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.dates.map((date, i) => ({
    name: date,
    income: data.revenue[i],
    expenses: data.expenses[i],
  }));

  return (
    <Card className="lg:col-span-2">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900">Revenue Overview</h3>
          <div className="inline-flex items-center space-x-4">
            <span className="inline-flex items-center text-xs font-medium">
              <span className="w-3 h-3 rounded-full bg-primary mr-1.5"></span>
              Income
            </span>
            <span className="inline-flex items-center text-xs font-medium">
              <span className="w-3 h-3 rounded-full bg-amber-500 mr-1.5"></span>
              Expenses
            </span>
          </div>
        </div>
        
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 10,
                right: 30,
                left: 20,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis 
                tickFormatter={(value) => {
                  // Format large numbers with abbreviations for chart readability
                  if (value >= 1000000000) {
                    return `Rp ${(value / 1000000000).toFixed(1)}M`;
                  } else if (value >= 1000000) {
                    return `Rp ${(value / 1000000).toFixed(1)}Jt`;
                  } else if (value >= 1000) {
                    return `Rp ${(value / 1000).toFixed(0)}K`;
                  }
                  return formatCurrency(value);
                }}
                tickLine={false}
                axisLine={false}
                width={120}
              />
              <Tooltip 
                formatter={(value) => [formatCurrency(typeof value === 'number' ? value : 0), '']}
                contentStyle={{ 
                  backgroundColor: 'white',
                  borderColor: '#e2e8f0',
                  borderRadius: '0.375rem',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                }}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#4F46E5"
                fill="#4F46E5"
                fillOpacity={0.1}
                activeDot={{ r: 8 }}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#F59E0B"
                fill="#F59E0B"
                fillOpacity={0.1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
