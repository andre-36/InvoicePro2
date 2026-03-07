import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Package } from "lucide-react";
import { Link } from "wouter";

import { useStore } from "@/lib/store-context";

type LowStockProduct = {
  id: number;
  name: string;
  sku: string;
  minStock: number;
  min_stock?: number;
  total_quantity?: string;
};

export function LowStockProducts() {
  const { currentStoreId } = useStore();
  const { data: products, isLoading } = useQuery<LowStockProduct[]>({
    queryKey: [`/api/stores/${currentStoreId}/products/lowstock`],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Low Stock Alert
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const lowStockProducts = (products || []).slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Low Stock Alert
          </CardTitle>
          <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
            {products?.length || 0} items
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {lowStockProducts.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">All products have sufficient stock</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lowStockProducts.map((product) => {
              const currentStock = parseFloat(product.total_quantity || '0');
              const minStock = product.minStock || product.min_stock || 10;
              return (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-2 bg-amber-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.sku}</p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-sm font-semibold text-amber-600">
                      {Math.floor(currentStock)} pcs
                    </p>
                    <p className="text-xs text-gray-500">
                      min: {minStock}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Link href="/products" className="block mt-4 text-center text-sm text-primary hover:underline">
          View all products →
        </Link>
      </CardContent>
    </Card>
  );
}
