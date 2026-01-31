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

  // Print PO with A4 format using iframe
  const handlePrint = () => {
    if (!purchaseOrder) return;
    
    // Create hidden iframe for printing
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    printFrame.style.left = '-9999px';
    document.body.appendChild(printFrame);

    const printDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!printDoc) return;

    // Generate print content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Purchase Order - ${purchaseOrder.purchaseOrderNumber}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
            background: white;
            width: 21cm;
            min-height: 29.7cm;
            padding: 1.5cm;
          }
          .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1cm;
            border-bottom: 2px solid #333;
            padding-bottom: 0.5cm;
          }
          .logo img {
            width: 4cm;
            height: auto;
            max-height: 2.5cm;
            object-fit: contain;
          }
          .company-info {
            text-align: right;
          }
          .company-name {
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 0.2cm;
          }
          .title-section {
            text-align: center;
            margin-bottom: 0.8cm;
          }
          .title {
            font-size: 18pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 0.3cm;
          }
          .po-number {
            font-size: 13pt;
            font-weight: 600;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1cm;
            margin-bottom: 1cm;
          }
          .info-box {
            padding: 0.4cm;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          .info-box h4 {
            font-size: 10pt;
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 0.3cm;
            border-bottom: 1px solid #eee;
            padding-bottom: 0.2cm;
          }
          .info-box p {
            font-size: 11pt;
            margin: 0.1cm 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1cm;
            font-size: 10pt;
          }
          th {
            background: #f5f5f5;
            padding: 0.3cm 0.2cm;
            text-align: left;
            font-weight: 600;
            border: 1px solid #ddd;
          }
          th.text-right {
            text-align: right;
          }
          td {
            padding: 0.25cm 0.2cm;
            border: 1px solid #ddd;
            vertical-align: top;
          }
          td.text-right {
            text-align: right;
          }
          .totals {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 1cm;
          }
          .totals-box {
            width: 8cm;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 0.15cm 0;
            font-size: 11pt;
          }
          .totals-row.total {
            border-top: 2px solid #333;
            margin-top: 0.3cm;
            padding-top: 0.3cm;
            font-weight: bold;
            font-size: 12pt;
          }
          .notes {
            margin-bottom: 1cm;
            padding: 0.4cm;
            background: #f9f9f9;
            border-radius: 4px;
          }
          .notes h4 {
            font-size: 10pt;
            font-weight: 600;
            margin-bottom: 0.2cm;
          }
          .notes p {
            font-size: 10pt;
            white-space: pre-line;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2cm;
            margin-top: 2cm;
          }
          .signature-box {
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #000;
            margin-top: 2cm;
            padding-top: 0.3cm;
            font-size: 10pt;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            ${currentUser?.logoUrl 
              ? `<img src="${currentUser.logoUrl}" alt="Logo" />`
              : `<div class="company-name">${currentUser?.companyName || 'Company Name'}</div>`
            }
          </div>
          <div class="company-info">
            <div class="company-name">${currentUser?.companyName || 'Company Name'}</div>
            ${currentUser?.companyAddress ? `<div>${currentUser.companyAddress}</div>` : ''}
            ${currentUser?.companyPhone ? `<div>Tel: ${currentUser.companyPhone}</div>` : ''}
            ${currentUser?.companyEmail ? `<div>Email: ${currentUser.companyEmail}</div>` : ''}
          </div>
        </div>

        <div class="title-section">
          <div class="title">Purchase Order</div>
          <div class="po-number">${purchaseOrder.purchaseOrderNumber}</div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h4>Supplier Information</h4>
            <p><strong>${purchaseOrder.supplierName}</strong></p>
            ${purchaseOrder.supplierAddress ? `<p>${purchaseOrder.supplierAddress}</p>` : ''}
            ${purchaseOrder.supplierPhone ? `<p>Tel: ${purchaseOrder.supplierPhone}</p>` : ''}
            ${purchaseOrder.supplierEmail ? `<p>Email: ${purchaseOrder.supplierEmail}</p>` : ''}
          </div>
          <div class="info-box">
            <h4>Order Details</h4>
            <p><strong>Order Date:</strong> ${formatDate(purchaseOrder.orderDate)}</p>
            <p><strong>Status:</strong> ${purchaseOrder.status.charAt(0).toUpperCase() + purchaseOrder.status.slice(1)}</p>
            ${purchaseOrder.useFakturPajak ? `<p><strong>Faktur Pajak:</strong> PPN ${purchaseOrder.taxRate || 11}%</p>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 5%">No</th>
              <th style="width: 40%">Description</th>
              <th style="width: 12%" class="text-right">Qty</th>
              <th style="width: 18%" class="text-right">${purchaseOrder.useFakturPajak ? 'Unit Cost Before Tax' : 'Unit Cost'}</th>
              ${purchaseOrder.useFakturPajak ? '<th style="width: 10%" class="text-right">Tax</th>' : ''}
              <th style="width: 15%" class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${purchaseOrder.items.map((item: any, index: number) => {
              const unitCost = parseFloat(item.unitCost || '0');
              const quantity = parseFloat(item.quantity || '0');
              const taxRate = parseFloat(purchaseOrder.taxRate || '11');
              
              // Calculate unit cost before tax and tax per unit
              const unitCostBeforeTax = purchaseOrder.useFakturPajak ? unitCost / (1 + taxRate / 100) : unitCost;
              const taxPerUnit = purchaseOrder.useFakturPajak ? unitCost - unitCostBeforeTax : 0;
              const totalTax = taxPerUnit * quantity;
              const lineTotal = unitCost * quantity;
              
              return `
              <tr>
                <td>${index + 1}</td>
                <td>${item.description}</td>
                <td class="text-right">${quantity}</td>
                <td class="text-right">${formatCurrency(unitCostBeforeTax.toString())}</td>
                ${purchaseOrder.useFakturPajak ? `<td class="text-right">${formatCurrency(totalTax.toString())}</td>` : ''}
                <td class="text-right">${formatCurrency(lineTotal.toString())}</td>
              </tr>
            `}).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-box">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(purchaseOrder.subtotal)}</span>
            </div>
            ${parseFloat(purchaseOrder.taxAmount || '0') > 0 ? `
              <div class="totals-row">
                <span>Tax (PPN ${purchaseOrder.taxRate || 11}%):</span>
                <span>${formatCurrency(purchaseOrder.taxAmount)}</span>
              </div>
            ` : ''}
            ${parseFloat(purchaseOrder.discount || '0') > 0 ? `
              <div class="totals-row">
                <span>Discount:</span>
                <span>-${formatCurrency(purchaseOrder.discount)}</span>
              </div>
            ` : ''}
            ${parseFloat(purchaseOrder.shipping || '0') > 0 ? `
              <div class="totals-row">
                <span>Shipping:</span>
                <span>${formatCurrency(purchaseOrder.shipping)}</span>
              </div>
            ` : ''}
            <div class="totals-row total">
              <span>Total Amount:</span>
              <span>${formatCurrency(purchaseOrder.totalAmount)}</span>
            </div>
          </div>
        </div>

        ${purchaseOrder.notes ? `
          <div class="notes">
            <h4>Notes:</h4>
            <p>${purchaseOrder.notes}</p>
          </div>
        ` : ''}

        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line">Authorized Signature</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Supplier Acknowledgment</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printDoc.open();
    printDoc.write(printContent);
    printDoc.close();

    // Wait for content to load, then print
    printFrame.onload = () => {
      setTimeout(() => {
        printFrame.contentWindow?.print();
        // Remove iframe after printing
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      }, 250);
    };
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
                  <TableHead>{purchaseOrder.useFakturPajak ? 'Unit Cost Before Tax' : 'Unit Cost'}</TableHead>
                  {purchaseOrder.useFakturPajak && <TableHead>Tax</TableHead>}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrder.items.map((item: any, index: number) => {
                  const orderedQty = parseFloat(item.quantity);
                  const receivedQty = parseFloat(item.receivedQuantity || '0');
                  const isFullyReceived = receivedQty >= orderedQty;
                  
                  // Calculate unit cost before tax and tax
                  const unitCost = parseFloat(item.unitCost || '0');
                  const taxRate = parseFloat(purchaseOrder.taxRate || '11');
                  const unitCostBeforeTax = purchaseOrder.useFakturPajak ? unitCost / (1 + taxRate / 100) : unitCost;
                  const taxPerUnit = purchaseOrder.useFakturPajak ? unitCost - unitCostBeforeTax : 0;
                  const totalTax = taxPerUnit * orderedQty;
                  const lineTotal = unitCost * orderedQty;
                  
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
                      <TableCell data-testid={`item-unit-cost-${index}`}>{formatCurrency(unitCostBeforeTax.toString())}</TableCell>
                      {purchaseOrder.useFakturPajak && (
                        <TableCell data-testid={`item-tax-${index}`}>{formatCurrency(totalTax.toString())}</TableCell>
                      )}
                      <TableCell className="text-right font-medium" data-testid={`item-total-${index}`}>
                        {formatCurrency(lineTotal.toString())}
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