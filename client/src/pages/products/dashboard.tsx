import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { ArrowLeft, TrendingUp, TrendingDown, Package, DollarSign, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

interface ProductDashboardProps {
  id: number;
}

type SalesHistory = {
  id: number;
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
};

type Reservation = {
  invoiceId: number;
  invoiceNumber: string;
  clientName: string;
  totalInvoiceQty: number;
  deliveredQty: number;
  reservedQuantity: number;
};

type Product = {
  id: number;
  name: string;
  sku: string;
  description: string;
  currentSellingPrice: string;
};

export default function ProductDashboard({ id }: ProductDashboardProps) {
  const [, setLocation] = useLocation();

  const { data: product, isLoading: isLoadingProduct, error: productError } = useQuery<Product>({
    queryKey: [`/api/products/${id}`],
  });

  const { data: stats, isLoading: isLoadingStats, error: statsError } = useQuery<ProductStats>({
    queryKey: [`/api/products/${id}/stats`],
  });

  const { data: salesHistory, isLoading: isLoadingSales, error: salesError } = useQuery<SalesHistory[]>({
    queryKey: [`/api/products/${id}/sales`],
  });

  const { data: purchaseHistory, isLoading: isLoadingPurchases, error: purchasesError } = useQuery<PurchaseHistory[]>({
    queryKey: [`/api/products/${id}/purchases`],
  });

  const { data: reservations, isLoading: isLoadingReservations, error: reservationsError } = useQuery<Reservation[]>({
    queryKey: [`/api/products/${id}/reservations`],
  });

  if (isLoadingProduct) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
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

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
            <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Current Price</p>
          <p className="text-lg font-semibold text-foreground">{formatCurrency(product.currentSellingPrice)}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingStats ? (
          Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))
        ) : statsError ? (
          <div className="col-span-4">
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
                <p className="text-xs text-muted-foreground">Units in stock</p>
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
          </>
        )}
      </div>

      {/* Reserved Stock */}
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

      {/* Sales and Purchase History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Sales History</CardTitle>
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesHistory.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
                        <TableCell>{sale.clientName}</TableCell>
                        <TableCell>{sale.quantity}</TableCell>
                        <TableCell>{formatCurrency(sale.total)}</TableCell>
                        <TableCell>{getStatusBadge(sale.status, 'sales')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No sales history available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchase History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Purchase History</CardTitle>
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
                <p className="text-destructive">Failed to load purchase history</p>
              </div>
            ) : purchaseHistory && purchaseHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>GR #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseHistory.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-medium">{purchase.receiptNumber}</TableCell>
                        <TableCell>{purchase.supplierName}</TableCell>
                        <TableCell>{purchase.quantity}</TableCell>
                        <TableCell>{formatCurrency(purchase.unitCost)}</TableCell>
                        <TableCell>{purchase.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No purchase history available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}