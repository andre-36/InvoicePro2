import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { format } from "date-fns";
import { Edit, Trash2, Package, Send, Check, Clock, X, AlertTriangle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatCurrency } from "@/lib/utils";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PurchaseOrderDetailProps {
  id: number;
}

export default function PurchaseOrderDetailPage({ id }: PurchaseOrderDetailProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [receivingQuantities, setReceivingQuantities] = useState<{ [key: number]: string }>({});

  const { data: purchaseOrder, isLoading, error } = useQuery({
    queryKey: ['/api/purchase-orders', id],
  });

  // Delete purchase order mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/purchase-orders/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      toast({
        title: "Purchase order deleted",
        description: "The purchase order has been deleted successfully.",
      });
      navigate("/purchase-orders");
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
    mutationFn: async (status: string) => {
      return apiRequest('PATCH', `/api/purchase-orders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders', id] });
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

  // Receive items mutation
  const receiveItemsMutation = useMutation({
    mutationFn: async (itemReceived: { itemId: number, quantityReceived: number }[]) => {
      return apiRequest('POST', `/api/purchase-orders/${id}/receive`, { items: itemReceived });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      setReceivingQuantities({});
      toast({
        title: "Items received",
        description: "Items have been marked as received and inventory has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to receive items: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle sending purchase order (change status to sent)
  const handleSendPurchaseOrder = () => {
    updateStatusMutation.mutate('sent');
  };

  // Handle marking as received
  const handleMarkAsReceived = () => {
    updateStatusMutation.mutate('received');
  };

  // Handle receiving specific items
  const handleReceiveItems = () => {
    if (!purchaseOrder?.items) return;

    const itemsToReceive = Object.entries(receivingQuantities)
      .filter(([, quantity]) => quantity && parseFloat(quantity) > 0)
      .map(([itemId, quantity]) => ({
        itemId: parseInt(itemId),
        quantityReceived: parseFloat(quantity)
      }));

    if (itemsToReceive.length === 0) {
      toast({
        title: "No items selected",
        description: "Please enter quantities for items you want to receive.",
        variant: "destructive",
      });
      return;
    }

    receiveItemsMutation.mutate(itemsToReceive);
  };

  // Update receiving quantity for an item
  const updateReceivingQuantity = (itemId: number, quantity: string) => {
    setReceivingQuantities(prev => ({
      ...prev,
      [itemId]: quantity
    }));
  };

  // Render badge based on purchase order status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800"><Send className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'received':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Received</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800"><Package className="w-3 h-3 mr-1" />Partial</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800"><X className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !purchaseOrder) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Purchase Order Not Found</h1>
        <p className="text-gray-500 mb-4">The purchase order you're looking for doesn't exist or has been deleted.</p>
        <Button onClick={() => navigate("/purchase-orders")}>
          Back to Purchase Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Order {purchaseOrder.purchaseOrderNumber}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Created {formatDate(purchaseOrder.createdAt)} • Due {formatDate(purchaseOrder.expectedDeliveryDate)}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {getStatusBadge(purchaseOrder.status)}
          
          {purchaseOrder.status === 'draft' && (
            <Button onClick={handleSendPurchaseOrder} disabled={updateStatusMutation.isPending}>
              <Send className="mr-2 h-4 w-4" />
              Send to Supplier
            </Button>
          )}
          
          {(purchaseOrder.status === 'sent' || purchaseOrder.status === 'partial') && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Package className="mr-2 h-4 w-4" />
                  Receive Items
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Receive Items</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Ordered</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead>Remaining</TableHead>
                        <TableHead>Receive Now</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseOrder.items.map((item: any) => {
                        const orderedQty = parseFloat(item.quantity);
                        const receivedQty = parseFloat(item.receivedQuantity || '0');
                        const remainingQty = orderedQty - receivedQty;
                        const maxReceivable = remainingQty;
                        
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.description}</TableCell>
                            <TableCell>{orderedQty}</TableCell>
                            <TableCell>{receivedQty}</TableCell>
                            <TableCell>{remainingQty}</TableCell>
                            <TableCell>
                              {remainingQty > 0 ? (
                                <Input
                                  type="number"
                                  placeholder="0"
                                  min="0"
                                  max={maxReceivable}
                                  step="any"
                                  value={receivingQuantities[item.id] || ''}
                                  onChange={(e) => updateReceivingQuantity(item.id, e.target.value)}
                                  className="w-24"
                                  data-testid={`input-receive-quantity-${item.id}`}
                                />
                              ) : (
                                <span className="text-green-600">Complete</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      onClick={handleReceiveItems} 
                      disabled={receiveItemsMutation.isPending}
                      data-testid="button-confirm-receive"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {receiveItemsMutation.isPending ? 'Processing...' : 'Confirm Receipt'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          
          {purchaseOrder.status !== 'received' && purchaseOrder.status !== 'cancelled' && (
            <Button onClick={handleMarkAsReceived} variant="outline" disabled={updateStatusMutation.isPending}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Received
            </Button>
          )}
          
          <Button onClick={() => navigate(`/purchase-orders/${id}/edit`)} variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-red-600 hover:text-red-700">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
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
                  onClick={() => deleteMutation.mutate()}
                  className="bg-red-600 hover:bg-red-700"
                  data-testid="button-confirm-delete"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Purchase Order Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supplier Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Supplier Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-base font-semibold" data-testid="text-supplier-name">{purchaseOrder.supplierName}</p>
            </div>
            
            {purchaseOrder.supplierEmail && (
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-base" data-testid="text-supplier-email">{purchaseOrder.supplierEmail}</p>
              </div>
            )}
            
            {purchaseOrder.supplierPhone && (
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p className="text-base" data-testid="text-supplier-phone">{purchaseOrder.supplierPhone}</p>
              </div>
            )}
            
            {purchaseOrder.supplierAddress && (
              <div>
                <label className="text-sm font-medium text-gray-500">Address</label>
                <p className="text-base whitespace-pre-line" data-testid="text-supplier-address">{purchaseOrder.supplierAddress}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Order Date</label>
              <p className="text-base" data-testid="text-order-date">{formatDate(purchaseOrder.orderDate)}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Expected Delivery</label>
              <p className="text-base" data-testid="text-expected-delivery">{purchaseOrder.expectedDeliveryDate ? formatDate(purchaseOrder.expectedDeliveryDate) : 'Not specified'}</p>
            </div>
            
            {purchaseOrder.deliveredDate && (
              <div>
                <label className="text-sm font-medium text-gray-500">Delivered Date</label>
                <p className="text-base text-green-600" data-testid="text-delivered-date">{formatDate(purchaseOrder.deliveredDate)}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1" data-testid="status-badge">
                {getStatusBadge(purchaseOrder.status)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Quantity Ordered</TableHead>
                  <TableHead>Quantity Received</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrder.items.map((item: any, index: number) => {
                  const orderedQty = parseFloat(item.quantity);
                  const receivedQty = parseFloat(item.receivedQuantity || '0');
                  const isFullyReceived = receivedQty >= orderedQty;
                  
                  return (
                    <TableRow key={item.id} className={isFullyReceived ? 'bg-green-50' : ''} data-testid={`item-row-${index}`}>
                      <TableCell className="font-medium" data-testid={`item-description-${index}`}>
                        {item.description}
                        {isFullyReceived && <Check className="inline ml-2 h-4 w-4 text-green-600" />}
                      </TableCell>
                      <TableCell data-testid={`item-ordered-qty-${index}`}>{orderedQty}</TableCell>
                      <TableCell data-testid={`item-received-qty-${index}`}>
                        <span className={receivedQty > 0 ? 'font-semibold text-green-600' : ''}>
                          {receivedQty}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`item-unit-cost-${index}`}>{formatCurrency(item.unitCost)}</TableCell>
                      <TableCell data-testid={`item-tax-${index}`}>{formatCurrency(item.taxAmount)}</TableCell>
                      <TableCell className="text-right font-medium" data-testid={`item-total-${index}`}>
                        {formatCurrency(item.totalAmount)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Totals and Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notes */}
        {purchaseOrder.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-gray-700" data-testid="text-notes">{purchaseOrder.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span data-testid="text-subtotal">{formatCurrency(purchaseOrder.subtotal)}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Tax:</span>
              <span data-testid="text-tax">{formatCurrency(purchaseOrder.taxAmount)}</span>
            </div>
            
            {parseFloat(purchaseOrder.discount || '0') > 0 && (
              <div className="flex justify-between">
                <span>Discount:</span>
                <span className="text-red-600" data-testid="text-discount">-{formatCurrency(purchaseOrder.discount)}</span>
              </div>
            )}
            
            {parseFloat(purchaseOrder.shipping || '0') > 0 && (
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span data-testid="text-shipping">{formatCurrency(purchaseOrder.shipping)}</span>
              </div>
            )}
            
            <hr />
            
            <div className="flex justify-between text-lg font-bold">
              <span>Total Amount:</span>
              <span data-testid="text-total">{formatCurrency(purchaseOrder.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}