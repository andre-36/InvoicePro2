import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Clock, CheckCircle, Percent } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import { useStore } from "@/lib/store-context";

type ProfitOverviewData = {
  realizedProfit: number;
  realizedRevenue: number;
  realizedCost: number;
  projectedProfit: number;
  projectedRevenue: number;
  projectedCost: number;
  totalExpectedProfit: number;
  averageMargin: number;
  deliveredCount: number;
  pendingCount: number;
};

interface ProfitOverviewProps {
  startDate?: string;
  endDate?: string;
}

export function ProfitOverview({ startDate, endDate }: ProfitOverviewProps) {
  const { currentStoreId } = useStore();
  const { data, isLoading, error } = useQuery<ProfitOverviewData>({
    queryKey: [`/api/stores/${currentStoreId}/dashboard/profit-overview`, { start: startDate, end: endDate }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);
      const response = await fetch(`/api/stores/${currentStoreId}/dashboard/profit-overview?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch profit overview');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg bg-gray-50">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="col-span-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Profit Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">Failed to load profit data</p>
        </CardContent>
      </Card>
    );
  }

  const isPositiveRealized = data.realizedProfit >= 0;
  const isPositiveProjected = data.projectedProfit >= 0;
  const isPositiveTotal = data.totalExpectedProfit >= 0;

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Profit Overview (FIFO)
          </CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-gray-500">
              <CheckCircle className="h-4 w-4 text-green-500" />
              {data.deliveredCount} delivered
            </span>
            <span className="flex items-center gap-1 text-gray-500">
              <Clock className="h-4 w-4 text-amber-500" />
              {data.pendingCount} pending
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-green-700">Realized Profit</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <p className={`text-2xl font-bold ${isPositiveRealized ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(data.realizedProfit)}
            </p>
            <div className="mt-2 text-xs text-green-600 space-y-0.5">
              <p>Revenue: {formatCurrency(data.realizedRevenue)}</p>
              <p>Cost: {formatCurrency(data.realizedCost)}</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-amber-700">Projected Profit</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className={`text-2xl font-bold ${isPositiveProjected ? 'text-amber-600' : 'text-red-600'}`}>
              {formatCurrency(data.projectedProfit)}
            </p>
            <div className="mt-2 text-xs text-amber-600 space-y-0.5">
              <p>Est. Revenue: {formatCurrency(data.projectedRevenue)}</p>
              <p>Est. Cost: {formatCurrency(data.projectedCost)}</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-blue-700">Total Expected</span>
              {isPositiveTotal ? (
                <TrendingUp className="h-4 w-4 text-blue-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className={`text-2xl font-bold ${isPositiveTotal ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(data.totalExpectedProfit)}
            </p>
            <p className="mt-2 text-xs text-blue-600">
              Realized + Projected
            </p>
          </div>

          <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-purple-700">Average Margin</span>
              <Percent className="h-4 w-4 text-purple-500" />
            </div>
            <p className={`text-2xl font-bold ${data.averageMargin >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
              {data.averageMargin.toFixed(1)}%
            </p>
            <p className="mt-2 text-xs text-purple-600">
              Based on total revenue
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">
            <strong>Note:</strong> Realized profit is calculated from delivered items using FIFO cost allocation. 
            Projected profit is estimated from pending deliveries using FIFO-based cost simulation from available stock.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
