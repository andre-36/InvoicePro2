import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Award } from "lucide-react";
import { Link } from "wouter";

type ProductPerformance = {
  id: number;
  name: string;
  sku: string;
  totalSold: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
};

export function TopSellingProducts() {
  const { data, isLoading } = useQuery<ProductPerformance[]>({
    queryKey: ['/api/stores/1/dashboard/products/performance'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Top Selling Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const topProducts = data?.slice(0, 5) || [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-500" />
          Top Selling Products
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topProducts.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Award className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No sales data yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div
                key={product.id}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                    index === 1 ? 'bg-gray-100 text-gray-600' :
                    index === 2 ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-50 text-gray-500'}
                `}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">
                    {Math.floor(product.totalSold)} sold
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">
                    {formatCurrency(product.totalProfit)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {product.profitMargin.toFixed(1)}% margin
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        <Link href="/products" className="block mt-4 text-center text-sm text-primary hover:underline">
          View all products →
        </Link>
      </CardContent>
    </Card>
  );
}
