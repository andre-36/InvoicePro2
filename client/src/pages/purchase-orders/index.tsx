import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Filter, ArrowUpDown, MoreHorizontal, Eye, FilePenLine, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type PurchaseOrder = {
  id: number;
  purchaseOrderNumber: string;
  supplierName: string;
  orderDate: string;
  expectedDeliveryDate: string;
  totalAmount: string;
  status: 'draft' | 'sent' | 'received' | 'partial' | 'cancelled';
};

type PurchaseOrderStatus = 'all' | 'draft' | 'sent' | 'received' | 'partial' | 'cancelled';

export default function PurchaseOrdersPage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: purchaseOrders, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/purchase-orders'],
  });

  // Delete purchase order mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/purchase-orders/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      toast({
        title: "Purchase order deleted",
        description: "The purchase order has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete purchase order: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Update purchase order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      return apiRequest('PATCH', `/api/purchase-orders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      toast({
        title: "Status updated",
        description: "The purchase order status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update status: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Filter purchase orders based on search query and status
  const filteredPurchaseOrders = purchaseOrders
    ? purchaseOrders.filter(purchaseOrder => {
        const matchesSearch = 
          purchaseOrder.purchaseOrderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          purchaseOrder.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || purchaseOrder.status === statusFilter;
        
        return matchesSearch && matchesStatus;
      })
    : [];
  
  // Render badge based on purchase order status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Draft</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800">Sent</Badge>;
      case 'received':
        return <Badge className="bg-green-100 text-green-800">Received</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Manage supplier orders and track deliveries</p>
        </div>
        
        <Link href="/purchase-orders/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Purchase Order
          </Button>
        </Link>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search purchase orders..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-purchase-orders"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value: string) => setStatusFilter(value as PurchaseOrderStatus)}
              >
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="All Statuses" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : filteredPurchaseOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-gray-100 p-3 mb-4">
                <Package className="h-6 w-6 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No purchase orders found</h3>
              <p className="text-sm text-gray-500 mb-4 max-w-md">
                {searchQuery || statusFilter !== 'all'
                  ? "Try adjusting your search or filter to find what you're looking for."
                  : "You haven't created any purchase orders yet. Get started by creating your first purchase order."}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Link href="/purchase-orders/create">
                  <Button data-testid="button-create-first-purchase-order">
                    <Plus className="mr-2 h-4 w-4" />
                    New Purchase Order
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">
                      <div className="flex items-center space-x-1">
                        <span>PO #</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Expected Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchaseOrders.map((purchaseOrder) => (
                    <TableRow key={purchaseOrder.id} className="group" data-testid={`row-purchase-order-${purchaseOrder.id}`}>
                      <TableCell className="font-medium text-primary">
                        <Link href={`/purchase-orders/${purchaseOrder.id}`}>
                          <a className="hover:underline" data-testid={`link-purchase-order-${purchaseOrder.id}`}>
                            {purchaseOrder.purchaseOrderNumber}
                          </a>
                        </Link>
                      </TableCell>
                      <TableCell data-testid={`text-supplier-${purchaseOrder.id}`}>{purchaseOrder.supplierName}</TableCell>
                      <TableCell data-testid={`text-order-date-${purchaseOrder.id}`}>{formatDate(purchaseOrder.orderDate)}</TableCell>
                      <TableCell data-testid={`text-expected-date-${purchaseOrder.id}`}>{formatDate(purchaseOrder.expectedDeliveryDate)}</TableCell>
                      <TableCell className="font-medium" data-testid={`text-amount-${purchaseOrder.id}`}>{formatCurrency(purchaseOrder.totalAmount)}</TableCell>
                      <TableCell data-testid={`status-${purchaseOrder.id}`}>{getStatusBadge(purchaseOrder.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0" data-testid={`button-actions-${purchaseOrder.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[180px]">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => navigate(`/purchase-orders/${purchaseOrder.id}`)} data-testid={`button-view-${purchaseOrder.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              <span>View</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate(`/purchase-orders/${purchaseOrder.id}/edit`)} data-testid={`button-edit-${purchaseOrder.id}`}>
                              <FilePenLine className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled={purchaseOrder.status === 'received'}>
                              <Select
                                onValueChange={(value) => {
                                  updateStatusMutation.mutate({ id: purchaseOrder.id, status: value });
                                }}
                                value={purchaseOrder.status}
                              >
                                <SelectTrigger className="border-none p-0 h-auto font-normal shadow-none">
                                  <span className="text-sm">Change Status</span>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="sent">Sent</SelectItem>
                                  <SelectItem value="partial">Partial</SelectItem>
                                  <SelectItem value="received">Received</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600" data-testid={`button-delete-${purchaseOrder.id}`}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete purchase order {purchaseOrder.purchaseOrderNumber}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(purchaseOrder.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                    data-testid="button-confirm-delete"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}