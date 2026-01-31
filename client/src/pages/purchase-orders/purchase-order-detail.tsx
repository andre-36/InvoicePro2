import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Edit, Trash2, Package, Send, Check, Clock, X, AlertTriangle, CheckCircle, ArrowLeft, Printer } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
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

  const { data: purchaseOrder, isLoading, error } = useQuery({
    queryKey: ['/api/purchase-orders', id],
  });

  // Fetch current user for company information
  const { data: currentUser } = useQuery<{
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
    logoUrl?: string;
  }>({
    queryKey: ['/api/user'],
  });

  // Print PO with A4 format
  const handlePrint = () => {
    // Create a temporary style element for A4 page size
    const styleElement = document.createElement('style');
    styleElement.id = 'po-print-style';
    styleElement.textContent = `
      @page {
        size: A4 portrait;
        margin: 0;
      }
      @media print {
        body > div:not(.print-po-a4-wrapper),
        #root > *:not(.print-po-a4-wrapper),
        .screen-only {
          display: none !important;
        }
        .print-po-a4-wrapper {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
        }
        html, body {
          width: 21cm !important;
          height: 29.7cm !important;
        }
      }
    `;
    document.head.appendChild(styleElement);

    // Trigger print
    setTimeout(() => {
      window.print();
      // Clean up the style element after printing
      setTimeout(() => {
        const el = document.getElementById('po-print-style');
        if (el) el.remove();
      }, 500);
    }, 100);
  };

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

  // Render badge based on purchase order status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800"><Package className="w-3 h-3 mr-1" />Partial</Badge>;
      case 'received':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Received</Badge>;
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
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate("/purchase-orders")} className="w-fit">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Purchase Orders
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Order {purchaseOrder.purchaseOrderNumber}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Created {formatDate(purchaseOrder.createdAt)} • Order Date {formatDate(purchaseOrder.orderDate)}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {getStatusBadge(purchaseOrder.status)}
          
          <Button onClick={() => navigate(`/purchase-orders/${id}/edit`)} variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>

          <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
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
            
            <div>
              <label className="text-sm font-medium text-gray-500">Faktur Pajak</label>
              <div className="mt-1">
                {purchaseOrder.useFakturPajak ? (
                  <Badge className="bg-green-100 text-green-800">
                    <Check className="w-3 h-3 mr-1" />
                    Menggunakan Faktur Pajak (PPN {purchaseOrder.taxRate || 11}%)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-100 text-gray-600">
                    <X className="w-3 h-3 mr-1" />
                    Tidak Menggunakan Faktur Pajak
                  </Badge>
                )}
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

      {/* Print Template - A4 Format */}
      <div className="print-po-a4-wrapper" style={{ display: 'none' }}>
        <div className="print-po-a4-template">
          {/* Header */}
          <div className="print-po-header">
            <div>
              {currentUser?.logoUrl ? (
                <img 
                  src={currentUser.logoUrl} 
                  alt="Company Logo" 
                  className="print-po-logo"
                />
              ) : (
                <div className="print-po-company-name">{currentUser?.companyName || 'Company Name'}</div>
              )}
            </div>
            <div className="print-po-company-info">
              <div className="print-po-company-name">{currentUser?.companyName || 'Company Name'}</div>
              {currentUser?.companyAddress && <div>{currentUser.companyAddress}</div>}
              {currentUser?.companyPhone && <div>Tel: {currentUser.companyPhone}</div>}
              {currentUser?.companyEmail && <div>Email: {currentUser.companyEmail}</div>}
            </div>
          </div>

          {/* Title */}
          <div className="print-po-title-section">
            <div className="print-po-title">Purchase Order</div>
            <div className="print-po-number">{purchaseOrder.purchaseOrderNumber}</div>
          </div>

          {/* Info Grid */}
          <div className="print-po-info-grid">
            <div className="print-po-info-box">
              <h4>Supplier Information</h4>
              <p><strong>{purchaseOrder.supplierName}</strong></p>
              {purchaseOrder.supplierAddress && <p>{purchaseOrder.supplierAddress}</p>}
              {purchaseOrder.supplierPhone && <p>Tel: {purchaseOrder.supplierPhone}</p>}
              {purchaseOrder.supplierEmail && <p>Email: {purchaseOrder.supplierEmail}</p>}
            </div>
            <div className="print-po-info-box">
              <h4>Order Details</h4>
              <p><strong>Order Date:</strong> {formatDate(purchaseOrder.orderDate)}</p>
              <p><strong>Status:</strong> {purchaseOrder.status.charAt(0).toUpperCase() + purchaseOrder.status.slice(1)}</p>
              {purchaseOrder.useFakturPajak && (
                <p><strong>Faktur Pajak:</strong> PPN {purchaseOrder.taxRate || 11}%</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table className="print-po-items-table">
            <thead>
              <tr>
                <th style={{ width: '5%' }}>No</th>
                <th style={{ width: '40%' }}>Description</th>
                <th style={{ width: '12%' }} className="text-right">Qty</th>
                <th style={{ width: '18%' }} className="text-right">Unit Cost</th>
                <th style={{ width: '10%' }} className="text-right">Tax</th>
                <th style={{ width: '15%' }} className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrder.items.map((item: any, index: number) => (
                <tr key={item.id || index}>
                  <td>{index + 1}</td>
                  <td>{item.description}</td>
                  <td className="text-right">{parseFloat(item.quantity)}</td>
                  <td className="text-right">{formatCurrency(item.unitCost)}</td>
                  <td className="text-right">{formatCurrency(item.taxAmount)}</td>
                  <td className="text-right">{formatCurrency(item.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="print-po-totals">
            <div className="print-po-totals-box">
              <div className="print-po-totals-row">
                <span>Subtotal:</span>
                <span>{formatCurrency(purchaseOrder.subtotal)}</span>
              </div>
              {parseFloat(purchaseOrder.taxAmount || '0') > 0 && (
                <div className="print-po-totals-row">
                  <span>Tax (PPN {purchaseOrder.taxRate || 11}%):</span>
                  <span>{formatCurrency(purchaseOrder.taxAmount)}</span>
                </div>
              )}
              {parseFloat(purchaseOrder.discount || '0') > 0 && (
                <div className="print-po-totals-row">
                  <span>Discount:</span>
                  <span>-{formatCurrency(purchaseOrder.discount)}</span>
                </div>
              )}
              {parseFloat(purchaseOrder.shipping || '0') > 0 && (
                <div className="print-po-totals-row">
                  <span>Shipping:</span>
                  <span>{formatCurrency(purchaseOrder.shipping)}</span>
                </div>
              )}
              <div className="print-po-totals-row total">
                <span>Total Amount:</span>
                <span>{formatCurrency(purchaseOrder.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {purchaseOrder.notes && (
            <div className="print-po-notes">
              <h4>Notes:</h4>
              <p>{purchaseOrder.notes}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="print-po-signatures">
            <div className="print-po-signature-box">
              <div className="print-po-signature-line">
                Authorized Signature
              </div>
            </div>
            <div className="print-po-signature-box">
              <div className="print-po-signature-line">
                Supplier Acknowledgment
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}