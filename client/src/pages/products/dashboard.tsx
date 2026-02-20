import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { ArrowLeft, TrendingUp, Package, DollarSign, Clock, Truck, BarChart3, CalendarDays, Layers, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart
} from "recharts";

const PAGE_SIZE = 10;

interface ProductDashboardProps {
  id: number;
}

type SalesHistory = {
  id: number;
  invoiceId: number;
  invoiceNumber: string;
  clientName: string;
  quantity: number;
  unitPrice: string;
  total: string;
  date: string;
  status: 'paid' | 'pending' | 'overdue';
};

type PurchaseHistory = {
  id: number;
  goodsReceiptId: number;
  receiptNumber: string;
  supplierName: string;
  quantity: number;
  unitCost: string;
  total: string;
  date: string;
  status: string;
};

type ProductStats = {
  totalSales: number;
  totalRevenue: string;
  totalPurchases: number;
  totalCost: string;
  currentStock: number;
  averageSellingPrice: string;
  averageCost: string;
  profitMargin: string;
  averageMonthlySales: number;
};

type SalesTrend = {
  period: string;
  totalQuantity: number;
  totalRevenue: number;
  count: number;
};

type Reservation = {
  invoiceId: number;
  invoiceNumber: string;
  clientName: string;
  totalInvoiceQty: number;
  deliveredQty: number;
  reservedQuantity: number;
};

type PendingPO = {
  purchaseOrderId: number;
  purchaseOrderNumber: string;
  supplierName: string;
  orderDate: string;
  orderedQty: number;
  receivedQty: number;
  pendingQty: number;
};

type BundleComponentSales = {
  componentProductId: number;
  componentName: string;
  componentSku: string;
  qtyPerBundle: number;
  bundleSalesQty: number;
  individualSalesQty: number;
  bundleRevenue: number;
  individualRevenue: number;
};

type Product = {
  id: number;
  name: string;
  sku: string;
  description: string;
  currentSellingPrice: string;
  productType?: string;
};

type PaginatedResponse<T> = {
  data: T[];
  total: number;
};

export default function ProductDashboard({ id }: ProductDashboardProps) {
  const [, setLocation] = useLocation();
  const [trendGroupBy, setTrendGroupBy] = useState<'daily' | 'monthly'>('monthly');
  const [salesPage, setSalesPage] = useState(1);
  const [purchasesPage, setPurchasesPage] = useState(1);

  useEffect(() => {
    setSalesPage(1);
    setPurchasesPage(1);
  }, [id]);

  const { data: product, isLoading: isLoadingProduct } = useQuery<Product>({
    queryKey: [`/api/products/${id}`],
  });

  const { data: stats, isLoading: isLoadingStats, error: statsError } = useQuery<ProductStats>({
    queryKey: [`/api/products/${id}/stats`],
  });

  const { data: salesResult, isLoading: isLoadingSales, error: salesError } = useQuery<PaginatedResponse<SalesHistory>>({
    queryKey: ['/api/products', id, 'sales', salesPage],
    queryFn: async () => {
      const res = await fetch(`/api/products/${id}/sales?page=${salesPage}&limit=${PAGE_SIZE}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });
  const salesHistory = salesResult?.data;
  const salesTotalCount = salesResult?.total || 0;
  const salesTotalPages = Math.ceil(salesTotalCount / PAGE_SIZE);

  const { data: purchaseResult, isLoading: isLoadingPurchases, error: purchasesError } = useQuery<PaginatedResponse<PurchaseHistory>>({
    queryKey: ['/api/products', id, 'purchases', purchasesPage],
    queryFn: async () => {
      const res = await fetch(`/api/products/${id}/purchases?page=${purchasesPage}&limit=${PAGE_SIZE}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });
  const purchaseHistory = purchaseResult?.data;
  const purchasesTotalCount = purchaseResult?.total || 0;
  const purchasesTotalPages = Math.ceil(purchasesTotalCount / PAGE_SIZE);

  const { data: reservations, isLoading: isLoadingReservations, error: reservationsError } = useQuery<Reservation[]>({
    queryKey: [`/api/products/${id}/reservations`],
  });

  const { data: pendingPOs, isLoading: isLoadingPendingPOs, error: pendingPOsError } = useQuery<PendingPO[]>({
    queryKey: [`/api/products/${id}/pending-pos`],
  });

  const { data: salesTrend, isLoading: isLoadingTrend } = useQuery<SalesTrend[]>({
    queryKey: ['/api/products', id, 'sales-trend', trendGroupBy],
    queryFn: async () => {
      const res = await fetch(`/api/products/${id}/sales-trend?groupBy=${trendGroupBy}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const { data: bundleAnalytics, isLoading: isLoadingBundleAnalytics } = useQuery<BundleComponentSales[]>({
    queryKey: ['/api/products', id, 'bundle-analytics'],
    queryFn: async () => {
      const res = await fetch(`/api/products/${id}/bundle-analytics`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: product?.productType === 'bundle',
  });

  if (isLoadingProduct) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-lg font-semibold mb-2">Product not found</h2>
        <Button 
          onClick={() => setLocation('/products')}
          data-testid="button-back-from-error"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
      </div>
    );
  }

  const isBundle = product.productType === 'bundle';

  const getStatusBadge = (status: string, type: 'sales' | 'purchase') => {
    if (type === 'sales') {
      switch (status) {
        case 'paid':
          return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>;
        case 'pending':
          return <Badge variant="secondary">Pending</Badge>;
        case 'overdue':
          return <Badge variant="destructive">Overdue</Badge>;
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    } else {
      switch (status) {
        case 'received':
          return <Badge variant="default" className="bg-green-100 text-green-800">Received</Badge>;
        case 'pending':
          return <Badge variant="secondary">Pending</Badge>;
        case 'cancelled':
          return <Badge variant="destructive">Cancelled</Badge>;
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    }
  };

  const formatTrendLabel = (period: string) => {
    if (trendGroupBy === 'monthly') {
      const [year, month] = period.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[parseInt(month) - 1]} ${year}`;
    }
    return period;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation('/products')}
            data-testid="button-back-to-products"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
              {isBundle && <Badge variant="secondary" className="bg-purple-100 text-purple-800">Bundle</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Current Price</p>
          <p className="text-lg font-semibold text-foreground">{formatCurrency(product.currentSellingPrice)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {isLoadingStats ? (
          Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))
        ) : statsError ? (
          <div className="col-span-5">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-destructive">Failed to load product statistics</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats?.totalSales || 0}</div>
                <p className="text-xs text-muted-foreground">Units sold</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{formatCurrency(stats?.totalRevenue || '0')}</div>
                <p className="text-xs text-muted-foreground">Total revenue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Stock Level</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats?.currentStock || 0}</div>
                <p className="text-xs text-muted-foreground">{isBundle ? 'Calculated from components' : 'Units in stock'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Profit Margin</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats?.profitMargin || '0%'}</div>
                <p className="text-xs text-muted-foreground">Average margin</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Sales/Month</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats?.averageMonthlySales || 0}</div>
                <p className="text-xs text-muted-foreground">Units per month</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Sales Trend
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant={trendGroupBy === 'daily' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTrendGroupBy('daily')}
            >
              Daily
            </Button>
            <Button
              variant={trendGroupBy === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTrendGroupBy('monthly')}
            >
              Monthly
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingTrend ? (
            <Skeleton className="h-[300px] w-full" />
          ) : salesTrend && salesTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="period" 
                  tickFormatter={formatTrendLabel}
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  yAxisId="qty"
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: 'Qty', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))' } }}
                />
                <YAxis 
                  yAxisId="revenue"
                  orientation="right"
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                  label={{ value: 'Revenue', angle: 90, position: 'insideRight', style: { fill: 'hsl(var(--muted-foreground))' } }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'totalRevenue') return [formatCurrency(value.toString()), 'Revenue'];
                    if (name === 'totalQuantity') return [value, 'Quantity'];
                    return [value, name];
                  }}
                  labelFormatter={formatTrendLabel}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend 
                  formatter={(value: string) => value === 'totalQuantity' ? 'Quantity' : 'Revenue'}
                />
                <Bar yAxisId="qty" dataKey="totalQuantity" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.8} />
                <Line yAxisId="revenue" type="monotone" dataKey="totalRevenue" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No sales data available yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {((reservations && reservations.length > 0) || isLoadingReservations) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Reserved By
            </CardTitle>
            {reservations && reservations.length > 0 && (
              <Badge variant="secondary">
                {reservations.reduce((sum, r) => sum + r.reservedQuantity, 0)} total reserved
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingReservations ? (
              <div className="space-y-4">
                {Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : reservationsError ? (
              <div className="text-center py-4">
                <p className="text-destructive">Failed to load reservations</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Delivered</TableHead>
                      <TableHead className="text-right">Reserved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservations?.map((reservation) => (
                      <TableRow key={reservation.invoiceId}>
                        <TableCell className="font-medium">
                          <Link href={`/invoices/${reservation.invoiceId}`} className="text-primary hover:underline">
                            {reservation.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{reservation.clientName}</TableCell>
                        <TableCell className="text-right">{reservation.totalInvoiceQty}</TableCell>
                        <TableCell className="text-right">{reservation.deliveredQty}</TableCell>
                        <TableCell className="text-right font-semibold text-amber-600">
                          {reservation.reservedQuantity}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {((pendingPOs && pendingPOs.length > 0) || isLoadingPendingPOs) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-500" />
              Pending PO
            </CardTitle>
            {pendingPOs && pendingPOs.length > 0 && (
              <Badge variant="secondary">
                {pendingPOs.reduce((sum, po) => sum + po.pendingQty, 0)} pending
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingPendingPOs ? (
              <div className="space-y-4">
                {Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : pendingPOsError ? (
              <div className="text-center py-4">
                <p className="text-destructive">Failed to load pending POs</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPOs?.map((po) => (
                      <TableRow key={po.purchaseOrderId}>
                        <TableCell className="font-medium">
                          <Link href={`/purchase-orders/${po.purchaseOrderId}`} className="text-primary hover:underline">
                            {po.purchaseOrderNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{po.supplierName}</TableCell>
                        <TableCell className="text-right">{po.orderedQty}</TableCell>
                        <TableCell className="text-right">{po.receivedQty}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          {po.pendingQty}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-foreground">Sales History</CardTitle>
            {salesTotalCount > 0 && (
              <span className="text-sm text-muted-foreground">{salesTotalCount} records</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingSales ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : salesError ? (
            <div className="text-center py-8">
              <p className="text-destructive">Failed to load sales history</p>
            </div>
          ) : salesHistory && salesHistory.length > 0 ? (
            <div className="space-y-3">
              {salesTotalCount > PAGE_SIZE ? (
                <ScrollArea className="h-[440px]">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesHistory.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="text-muted-foreground whitespace-nowrap">{sale.date}</TableCell>
                            <TableCell className="font-medium">
                              <Link href={`/invoices/${sale.invoiceId}`} className="text-primary hover:underline">
                                {sale.invoiceNumber}
                              </Link>
                            </TableCell>
                            <TableCell>{sale.clientName}</TableCell>
                            <TableCell className="text-right">{sale.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(sale.unitPrice)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(sale.total)}</TableCell>
                            <TableCell>{getStatusBadge(sale.status, 'sales')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesHistory.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="text-muted-foreground whitespace-nowrap">{sale.date}</TableCell>
                          <TableCell className="font-medium">
                            <Link href={`/invoices/${sale.invoiceId}`} className="text-primary hover:underline">
                              {sale.invoiceNumber}
                            </Link>
                          </TableCell>
                          <TableCell>{sale.clientName}</TableCell>
                          <TableCell className="text-right">{sale.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(sale.unitPrice)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(sale.total)}</TableCell>
                          <TableCell>{getStatusBadge(sale.status, 'sales')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {salesTotalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    Page {salesPage} of {salesTotalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSalesPage(p => Math.max(1, p - 1))}
                      disabled={salesPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSalesPage(p => Math.min(salesTotalPages, p + 1))}
                      disabled={salesPage >= salesTotalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No sales history available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {!isBundle && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-foreground">Goods Receipt History</CardTitle>
              {purchasesTotalCount > 0 && (
                <span className="text-sm text-muted-foreground">{purchasesTotalCount} records</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingPurchases ? (
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : purchasesError ? (
              <div className="text-center py-8">
                <p className="text-destructive">Failed to load goods receipt history</p>
              </div>
            ) : purchaseHistory && purchaseHistory.length > 0 ? (
              <div className="space-y-3">
                {purchasesTotalCount > PAGE_SIZE ? (
                  <ScrollArea className="h-[440px]">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>GR #</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Unit Cost</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseHistory.map((purchase) => (
                            <TableRow key={purchase.id}>
                              <TableCell className="text-muted-foreground whitespace-nowrap">{purchase.date}</TableCell>
                              <TableCell className="font-medium">
                                <Link href={`/goods-receipts/${purchase.goodsReceiptId}`} className="text-primary hover:underline">
                                  {purchase.receiptNumber}
                                </Link>
                              </TableCell>
                              <TableCell>{purchase.supplierName}</TableCell>
                              <TableCell className="text-right">{purchase.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(purchase.unitCost)}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(purchase.total)}</TableCell>
                              <TableCell>{getStatusBadge(purchase.status, 'purchase')}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>GR #</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit Cost</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchaseHistory.map((purchase) => (
                          <TableRow key={purchase.id}>
                            <TableCell className="text-muted-foreground whitespace-nowrap">{purchase.date}</TableCell>
                            <TableCell className="font-medium">
                              <Link href={`/goods-receipts/${purchase.goodsReceiptId}`} className="text-primary hover:underline">
                                {purchase.receiptNumber}
                              </Link>
                            </TableCell>
                            <TableCell>{purchase.supplierName}</TableCell>
                            <TableCell className="text-right">{purchase.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(purchase.unitCost)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(purchase.total)}</TableCell>
                            <TableCell>{getStatusBadge(purchase.status, 'purchase')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {purchasesTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">
                      Page {purchasesPage} of {purchasesTotalPages}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPurchasesPage(p => Math.max(1, p - 1))}
                        disabled={purchasesPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPurchasesPage(p => Math.min(purchasesTotalPages, p + 1))}
                        disabled={purchasesPage >= purchasesTotalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No goods receipt history available</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isBundle && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-500" />
              Bundle vs Individual Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingBundleAnalytics ? (
              <Skeleton className="h-48 w-full" />
            ) : bundleAnalytics && bundleAnalytics.length > 0 ? (
              <div className="space-y-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Component</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Qty/Bundle</TableHead>
                        <TableHead className="text-right">Sold via Bundle</TableHead>
                        <TableHead className="text-right">Sold Individually</TableHead>
                        <TableHead className="text-right">Bundle %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bundleAnalytics.map((comp) => {
                        const totalSold = comp.bundleSalesQty + comp.individualSalesQty;
                        const bundlePercent = totalSold > 0 ? ((comp.bundleSalesQty / totalSold) * 100).toFixed(1) : '0';
                        return (
                          <TableRow key={comp.componentProductId}>
                            <TableCell className="font-medium">
                              <Link href={`/products/${comp.componentProductId}/dashboard`} className="text-primary hover:underline">
                                {comp.componentName}
                              </Link>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{comp.componentSku}</TableCell>
                            <TableCell className="text-right">{comp.qtyPerBundle}</TableCell>
                            <TableCell className="text-right font-medium text-purple-600">{comp.bundleSalesQty}</TableCell>
                            <TableCell className="text-right">{comp.individualSalesQty}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary" className={parseFloat(bundlePercent) > 50 ? 'bg-purple-100 text-purple-800' : ''}>
                                {bundlePercent}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={bundleAnalytics.map(c => ({
                    name: c.componentName.length > 20 ? c.componentName.slice(0, 20) + '...' : c.componentName,
                    'Via Bundle': c.bundleSalesQty,
                    'Individual': c.individualSalesQty,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis fontSize={12} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Via Bundle" fill="hsl(280, 60%, 55%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Individual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.6} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8">
                <Layers className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No bundle sales data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
