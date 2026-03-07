import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Package, Boxes, TrendingUp } from "lucide-react";

import { useStore } from "@/lib/store-context";

type InventoryValueStats = {
  totalItems: number;
  totalValue: number;
  batchesCount: number;
  averageCost: number;
  valueByCategory: Array<{ category: string; value: number }>;
};

export function InventoryStatsCard() {
  const { currentStoreId } = useStore();
  const { data, isLoading } = useQuery<InventoryValueStats>({
    queryKey: [`/api/stores/${currentStoreId}/dashboard/inventory/value`],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Inventory Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">Inventory Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{formatCurrency(data.totalValue)}</p>
            <p className="text-xs text-gray-500">Total Inventory Value</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-lg font-semibold">{data.totalItems}</p>
              <p className="text-xs text-gray-500">Products</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-lg font-semibold">{data.batchesCount}</p>
              <p className="text-xs text-gray-500">Batches</p>
            </div>
          </div>
        </div>

        {data.valueByCategory.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-gray-500 mb-2">By Category</p>
            <div className="space-y-1">
              {data.valueByCategory.slice(0, 3).map((cat) => (
                <div key={cat.category} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate">{cat.category}</span>
                  <span className="font-medium">{formatCurrency(cat.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
