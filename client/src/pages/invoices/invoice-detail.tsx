import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import { format } from "date-fns";
import { Edit, Trash2, FileDown, Send, CreditCard, Clock, X, AlertTriangle, ArrowLeft, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generatePDF } from "@/lib/pdf-generator";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Invoice, InvoiceItem, Client } from "@shared/schema";
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

interface InvoiceDetailProps {
  id: number;
}

interface InvoiceDetailResponse {
  invoice: Invoice;
  items: InvoiceItem[];
  client?: Client;
}

export default function InvoiceDetailPage({ id }: InvoiceDetailProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentType: 'Cash',
    amount: '',
    notes: '',
  });

  const { data: invoiceData, isLoading, error } = useQuery<InvoiceDetailResponse>({
    queryKey: ['/api/invoices', id],
  });

  const { data: paymentsData = [] } = useQuery({
    queryKey: ['/api/invoices', id, 'payments'],
  });

  const invoice = invoiceData?.invoice;
  const items = invoiceData?.items || [];
  const client = invoiceData?.client;
  const invoicePayments = paymentsData || [];

  // Delete invoice mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/invoices/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Invoice deleted",
        description: "The invoice has been deleted successfully.",
      });
      navigate("/invoices");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete invoice: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update invoice status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest('PATCH', `/api/invoices/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
      toast({
        title: "Status updated",
        description: "The invoice status has been updated successfully.",
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

  // Generate PDF
  const handleDownloadPDF = async () => {
    if (!invoice) return;
    
    try {
      await generatePDF({
        invoice: {
          ...invoice,
          issueDate: formatDate(invoice.issueDate),
          dueDate: formatDate(invoice.dueDate)
        },
        items: items,
        client: client
      });
      
      toast({
        title: "Success",
        description: "Invoice PDF has been generated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  // Send invoice (change status to sent)
  const handleSendInvoice = () => {
    updateStatusMutation.mutate('sent');
  };

  // Mark as paid
  const handleMarkAsPaid = () => {
    updateStatusMutation.mutate('paid');
  };

  // Mark as overdue
  const handleMarkAsOverdue = () => {
    updateStatusMutation.mutate('overdue');
  };

  // Cancel invoice
  const handleCancelInvoice = () => {
    updateStatusMutation.mutate('cancelled');
  };

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', `/api/invoices/${id}/payments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id, 'payments'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'], refetchType: 'all' });
      if (invoice) {
        queryClient.invalidateQueries({ queryKey: [`/api/stores/${invoice.storeId}/transactions`], refetchType: 'all' });
      }
      setPaymentDialogOpen(false);
      setPaymentForm({
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        paymentType: 'Cash',
        amount: '',
        notes: '',
      });
      toast({
        title: "Success",
        description: "Payment added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add payment: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update payment mutation
  const updatePaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('PATCH', `/api/invoices/${id}/payments/${editingPayment.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id, 'payments'] });
      setPaymentDialogOpen(false);
      setEditingPayment(null);
      setPaymentForm({
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        paymentType: 'Cash',
        amount: '',
        notes: '',
      });
      toast({
        title: "Success",
        description: "Payment updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update payment: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete payment mutation
  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      return apiRequest('DELETE', `/api/invoices/${id}/payments/${paymentId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id, 'payments'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'], refetchType: 'all' });
      if (invoice) {
        queryClient.invalidateQueries({ queryKey: [`/api/stores/${invoice.storeId}/transactions`], refetchType: 'all' });
      }
      toast({
        title: "Success",
        description: "Payment deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete payment: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleAddPayment = () => {
    setEditingPayment(null);
    setPaymentForm({
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      paymentType: 'Cash',
      amount: '',
      notes: '',
    });
    setPaymentDialogOpen(true);
  };

  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment);
    setPaymentForm({
      paymentDate: format(new Date(payment.paymentDate), 'yyyy-MM-dd'),
      paymentType: payment.paymentType,
      amount: payment.amount,
      notes: payment.notes || '',
    });
    setPaymentDialogOpen(true);
  };

  const handleDeletePayment = (paymentId: number) => {
    deletePaymentMutation.mutate(paymentId);
  };

  // Calculate total payments made
  const totalPaymentsMade = invoicePayments.reduce((sum: number, payment: any) => {
    return sum + parseFloat(payment.amount || 0);
  }, 0);

  const invoiceTotal = invoice ? parseFloat(invoice.totalAmount) : 0;
  const canAddPayment = totalPaymentsMade < invoiceTotal || editingPayment;

  const handlePaymentSubmit = () => {
    if (!paymentForm.amount) {
      toast({
        title: "Error",
        description: "Amount is required",
        variant: "destructive",
      });
      return;
    }

    const data = {
      invoiceId: id,
      paymentDate: paymentForm.paymentDate,
      paymentType: paymentForm.paymentType,
      amount: paymentForm.amount,
      notes: paymentForm.notes,
    };

    if (editingPayment) {
      updatePaymentMutation.mutate(data);
    } else {
      createPaymentMutation.mutate(data);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Draft</Badge>;
      case 'sent':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-20" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Invoice Details</h1>
          <Button onClick={() => navigate("/invoices")}>Back to Invoices</Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-10">
              <div className="rounded-full bg-red-100 p-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Invoice Not Found</h3>
              <p className="text-sm text-gray-500 mb-4">
                The invoice you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Button onClick={() => navigate("/invoices")}>Back to Invoices</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isEditable = invoice.status !== 'paid' && invoice.status !== 'cancelled';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link href="/invoices">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              Invoice {invoice.invoiceNumber}
              <span className="ml-3">{getStatusBadge(invoice.status)}</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {format(new Date(invoice.issueDate), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Action buttons based on status */}
          {invoice.status === 'draft' && (
            <Button
              variant="outline"
              className="gap-1"
              onClick={handleSendInvoice}
            >
              <Send className="h-4 w-4" />
              <span>Send</span>
            </Button>
          )}
          
          {invoice.status === 'sent' && (
            <Button
              variant="outline"
              className="gap-1"
              onClick={handleMarkAsPaid}
            >
              <CreditCard className="h-4 w-4" />
              <span>Mark as Paid</span>
            </Button>
          )}
          
          {invoice.status === 'sent' && (
            <Button
              variant="outline"
              className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleMarkAsOverdue}
            >
              <Clock className="h-4 w-4" />
              <span>Mark as Overdue</span>
            </Button>
          )}
          
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <Button
              variant="outline"
              className="gap-1 text-gray-600"
              onClick={handleCancelInvoice}
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </Button>
          )}
          
          <Button
            variant="outline"
            className="gap-1"
            onClick={handleDownloadPDF}
          >
            <FileDown className="h-4 w-4" />
            <span>Download PDF</span>
          </Button>
          
          {isEditable && (
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-1"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[90vh] p-0">
                <div className="overflow-auto h-full">
                  <InvoiceForm 
                    invoiceId={id} 
                    onSuccess={() => {
                      setEditDialogOpen(false);
                      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
                    }}
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete invoice {invoice.invoiceNumber}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {/* Invoice Content */}
      <Card>
        <Tabs defaultValue="details" className="w-full">
          <div className="border-b px-6 pt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Invoice Details</TabsTrigger>
              <TabsTrigger value="payments">
                Payments {invoicePayments.length > 0 && `(${invoicePayments.length})`}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="details" className="m-0">
            <CardHeader className="border-b">
              <div className="flex flex-col md:flex-row justify-between">
                <div>
                  <CardTitle className="text-xl mb-2">Client Information</CardTitle>
                  <div className="space-y-1">
                    <p className="font-medium">{client?.name}</p>
                    <p className="text-sm text-gray-600">{client?.email}</p>
                    {client?.phone && (
                      <p className="text-sm text-gray-600">{client?.phone}</p>
                    )}
                    {client?.address && (
                      <p className="text-sm text-gray-600 whitespace-pre-line">{client?.address}</p>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 md:mt-0 md:text-right">
                  <div className="space-y-1">
                    <div className="flex justify-between md:justify-end md:flex-col">
                      <span className="text-sm font-medium text-gray-500 md:mb-1">Invoice Number:</span>
                      <span className="text-sm">{invoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between md:justify-end md:flex-col">
                      <span className="text-sm font-medium text-gray-500 md:mb-1">Invoice Date:</span>
                      <span className="text-sm">{formatDate(invoice.issueDate)}</span>
                    </div>
                    <div className="flex justify-between md:justify-end md:flex-col">
                      <span className="text-sm font-medium text-gray-500 md:mb-1">Due Date:</span>
                      <span className="text-sm">{formatDate(invoice.dueDate)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tax
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-normal text-sm text-gray-900">
                          {item.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {parseFloat(item.quantity).toString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {parseFloat(item.taxRate) > 0 ? `${item.taxRate}%` : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(item.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            
            <CardFooter className="flex-col items-end p-6 border-t">
              <div className="w-full sm:w-80 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">Subtotal:</span>
                  <span className="text-gray-900">{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">Tax:</span>
                  <span className="text-gray-900">{formatCurrency(invoice.taxAmount)}</span>
                </div>
                {parseFloat(invoice.discount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Discount:</span>
                    <span className="text-gray-900">-{formatCurrency(invoice.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(invoice.totalAmount)}</span>
                </div>
              </div>
              
              {invoice.notes && (
                <div className="w-full mt-6 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
                </div>
              )}
            </CardFooter>
          </TabsContent>

          <TabsContent value="payments" className="m-0 p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-medium">Payment Records</h3>
                {totalPaymentsMade >= invoiceTotal && (
                  <p className="text-sm text-green-600 mt-1">Invoice is fully paid</p>
                )}
              </div>
              <Button
                size="sm"
                onClick={handleAddPayment}
                disabled={!canAddPayment}
                data-testid="button-add-payment"
                title={!canAddPayment ? "Invoice is fully paid. No more payments can be added unless the invoice total is increased." : ""}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Payment
              </Button>
            </div>

            {invoicePayments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No payments recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoicePayments.map((payment: any) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(payment.paymentDate), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.paymentType}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(parseFloat(payment.amount))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.notes || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPayment(payment)}
                            className="mr-1"
                            data-testid={`button-edit-payment-${payment.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePayment(payment.id)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-payment-${payment.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Payment Dialog */}
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingPayment ? 'Edit Payment' : 'Add Payment'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                    <Input
                      type="date"
                      value={paymentForm.paymentDate}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                      data-testid="input-payment-date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                    <Select
                      value={paymentForm.paymentType}
                      onValueChange={(value) => setPaymentForm({ ...paymentForm, paymentType: value })}
                    >
                      <SelectTrigger data-testid="select-payment-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        placeholder="0.00"
                        data-testid="input-payment-amount"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPaymentForm({ ...paymentForm, amount: invoice!.totalAmount.toString() })}
                        data-testid="button-fill-amount"
                      >
                        Fill
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <Textarea
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      rows={2}
                      placeholder="Optional notes..."
                      data-testid="input-payment-notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPaymentDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handlePaymentSubmit}
                    disabled={createPaymentMutation.isPending || updatePaymentMutation.isPending}
                    data-testid="button-save-payment"
                  >
                    {editingPayment ? 'Update Payment' : 'Add Payment'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
