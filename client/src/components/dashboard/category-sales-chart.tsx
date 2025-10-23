import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

interface CategorySalesData {
  categoryId: number | null;
  categoryName: string;
  totalRevenue: number;
  totalQuantity: number;
  productCount: number;
}

const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

export function CategorySalesChart() {
  const { data, isLoading, error } = useQuery<CategorySalesData[]>({
    queryKey: ['/api/dashboard/category-sales'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-5">
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="flex justify-center mb-5">
            <Skeleton className="h-64 w-64 rounded-full" />
          </div>
          <div className="space-y-3">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Product Sales by Category
            </h3>
          </div>
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500 dark:text-gray-400">
              {error ? "Failed to load category sales data" : "No sales data available"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pieData = data.map((item, index) => ({
    name: item.categoryName,
    value: item.totalRevenue,
    count: item.productCount,
    color: COLORS[index % COLORS.length],
  }));

  const totalRevenue = data.reduce((sum, item) => sum + item.totalRevenue, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / totalRevenue) * 100).toFixed(1);
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sales: {formatCurrency(data.value)}
          </p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {percentage}% of total sales
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show label for slices less than 5%

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="font-semibold text-sm"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className="lg:col-span-2">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Product Sales by Category
          </h3>
        </div>
        
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
          <div className="w-full lg:w-1/2 flex justify-center">
            <div className="relative w-64 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                    label={renderCustomLabel}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
              </div>
            </div>
          </div>
          
          <div className="w-full lg:w-1/2 space-y-3">
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.categoryName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(item.totalRevenue)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({Math.round((item.totalRevenue / totalRevenue) * 100)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
