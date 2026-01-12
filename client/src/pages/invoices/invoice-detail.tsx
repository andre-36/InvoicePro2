import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import { format } from "date-fns";
import { Edit, Ban, FileDown, Send, CreditCard, X, AlertTriangle, ArrowLeft, Plus, Trash2, Printer, Truck, Package } from "lucide-react";
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
import type { Invoice, InvoiceItem, Client, PrintSettings, PaymentType, DeliveryNote } from "@shared/schema";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  const { data: paymentsData } = useQuery<any[]>({
    queryKey: ['/api/invoices', id, 'payments'],
  });

  // Fetch print settings
  const { data: printSettings } = useQuery<PrintSettings>({
    queryKey: ['/api/stores/1/print-settings'],
  });

  // Fetch current user for company information
  const { data: currentUser } = useQuery<{
    companyName?: string;
    companyTagline?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
    taxNumber?: string;
    logoUrl?: string;
    quotationNotes?: string;
    invoiceNotes?: string;
    deliveryNoteNotes?: string;
    defaultNotes?: string;
  }>({
    queryKey: ['/api/user'],
  });

  // Fetch payment types from settings
  const { data: paymentTypes } = useQuery<PaymentType[]>({
    queryKey: ['/api/stores/1/payment-types'],
  });

  // Fetch delivery notes for this invoice
  const { data: deliveryNotes } = useQuery<DeliveryNote[]>({
    queryKey: ['/api/invoices', id, 'delivery-notes'],
  });

  // Fetch delivery status for this invoice
  const { data: deliveryStatus } = useQuery<{
    orderedItems: { invoiceItemId: number; description: string; quantity: number; delivered: number; remaining: number }[];
    fullyDelivered: boolean;
  }>({
    queryKey: ['/api/invoices', id, 'delivery-status'],
  });

  // State for delivery note dialog
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({
    deliveryDate: format(new Date(), 'yyyy-MM-dd'),
    vehicleInfo: '',
    driverName: '',
    recipientName: '',
    notes: '',
    items: [] as { invoiceItemId: number; deliveredQuantity: string; deliveryType: string; remarks: string }[]
  });

  const invoice = invoiceData?.invoice;
  const items = invoiceData?.items || [];
  const client = invoiceData?.client;
  const invoicePayments = paymentsData || [];

  // Helper function to get default payment type from settings
  const getDefaultPaymentType = () => {
    const activePaymentTypes = paymentTypes?.filter(pt => pt.isActive) || [];
    return activePaymentTypes.length > 0 ? activePaymentTypes[0].name : 'Cash';
  };

  // Void invoice mutation (replaces delete - invoices should never be deleted, only voided)
  const voidMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/invoices/${id}/void`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
      toast({
        title: "Invoice voided",
        description: "The invoice has been voided successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to void invoice: ${error.message}`,
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
          dueDate: formatDate(invoice.dueDate),
          tax: invoice.taxAmount || '0',
          total: invoice.totalAmount,
          discount: invoice.discount || '0'
        },
        items: items.map(item => ({
          ...item,
          price: item.unitPrice
        })) as any,
        client: client as any
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

  // Void invoice
  const handleVoidInvoice = () => {
    updateStatusMutation.mutate('void');
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
        paymentType: getDefaultPaymentType(),
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
        paymentType: getDefaultPaymentType(),
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

  // Create delivery note mutation
  const createDeliveryNoteMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', `/api/invoices/${id}/delivery-notes`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id, 'delivery-notes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id, 'delivery-status'] });
      setDeliveryDialogOpen(false);
      resetDeliveryForm();
      toast({
        title: "Success",
        description: "Delivery note created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create delivery note: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete delivery note mutation
  const deleteDeliveryNoteMutation = useMutation({
    mutationFn: async (deliveryNoteId: number) => {
      return apiRequest('DELETE', `/api/delivery-notes/${deliveryNoteId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id, 'delivery-notes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id, 'delivery-status'] });
      toast({
        title: "Success",
        description: "Delivery note deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete delivery note: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const resetDeliveryForm = () => {
    setDeliveryForm({
      deliveryDate: format(new Date(), 'yyyy-MM-dd'),
      vehicleInfo: '',
      driverName: '',
      recipientName: '',
      notes: '',
      items: []
    });
  };

  const initializeDeliveryForm = () => {
    if (deliveryStatus?.orderedItems) {
      const itemsWithRemaining = deliveryStatus.orderedItems
        .filter(item => item.remaining > 0)
        .map(item => ({
          invoiceItemId: item.invoiceItemId,
          deliveredQuantity: item.remaining.toString(),
          deliveryType: 'delivered',
          remarks: ''
        }));
      setDeliveryForm(prev => ({
        ...prev,
        items: itemsWithRemaining
      }));
    }
    setDeliveryDialogOpen(true);
  };

  const handleDeliverySubmit = () => {
    const itemsToDeliver = deliveryForm.items.filter(
      item => parseFloat(item.deliveredQuantity) > 0
    );

    if (itemsToDeliver.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one item to deliver",
        variant: "destructive",
      });
      return;
    }

    const data = {
      deliveryNote: {
        storeId: invoice?.storeId || 1,
        invoiceId: id,
        deliveryDate: deliveryForm.deliveryDate,
        vehicleInfo: deliveryForm.vehicleInfo || null,
        driverName: deliveryForm.driverName || null,
        recipientName: deliveryForm.recipientName || null,
        notes: deliveryForm.notes || null,
      },
      items: itemsToDeliver.map(item => ({
        invoiceItemId: item.invoiceItemId,
        deliveredQuantity: item.deliveredQuantity,
        deliveryType: item.deliveryType || 'delivered',
        remarks: item.remarks || null
      }))
    };

    createDeliveryNoteMutation.mutate(data);
  };

  const handlePrintDeliveryNote = async (deliveryNote: DeliveryNote) => {
    try {
      const response = await fetch(`/api/delivery-notes/${deliveryNote.id}`, {
        credentials: 'include'
      });
      const dnData = await response.json();
      
      // Create hidden iframe for printing
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'absolute';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = 'none';
      printFrame.style.left = '-9999px';
      document.body.appendChild(printFrame);

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Delivery Note - ${deliveryNote.deliveryNumber}</title>
          <style>
            @page {
              size: 21.7cm 13.8cm landscape;
              margin: 0.5cm;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 11pt;
              margin: 0;
              padding: 10px;
              width: 21.7cm;
              height: 13.8cm;
              box-sizing: border-box;
            }
            .header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              border-bottom: 1px solid #333;
              padding-bottom: 8px;
            }
            .company-info h1 {
              font-size: 15pt;
              margin: 0 0 3px 0;
            }
            .company-info p {
              margin: 2px 0;
              font-size: 10pt;
            }
            .doc-info {
              text-align: right;
            }
            .doc-info h2 {
              font-size: 14pt;
              margin: 0 0 5px 0;
            }
            .doc-info p {
              margin: 2px 0;
              font-size: 10pt;
            }
            .client-section {
              margin-bottom: 10px;
            }
            .client-section h3 {
              font-size: 11pt;
              margin: 0 0 5px 0;
            }
            table {
              width: 95%;
              margin: 0 auto;
              border-collapse: collapse;
              font-size: 10pt;
            }
            th, td {
              border: 1px solid #333;
              padding: 4px 8px;
              text-align: left;
            }
            th {
              background-color: #f0f0f0;
            }
            .text-right {
              text-align: right;
            }
            .footer {
              margin-top: 15px;
              display: flex;
              justify-content: space-between;
            }
            .signature-box {
              width: 45%;
              text-align: center;
            }
            .signature-line {
              border-top: 1px solid #333;
              margin-top: 40px;
              padding-top: 5px;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <h1>${currentUser?.companyName || 'Company Name'}</h1>
              ${currentUser?.companyTagline ? `<p><em>${currentUser.companyTagline}</em></p>` : ''}
              ${currentUser?.companyAddress ? `<p>${currentUser.companyAddress}</p>` : ''}
              ${currentUser?.companyPhone ? `<p>Tel: ${currentUser.companyPhone}</p>` : ''}
            </div>
            <div class="doc-info">
              <h2>SURAT JALAN</h2>
              <p><strong>No: ${deliveryNote.deliveryNumber}</strong></p>
              <p>Tanggal: ${formatDate(deliveryNote.deliveryDate)}</p>
            </div>
          </div>
          
          <div class="client-section">
            <h3>Kepada:</h3>
            <p><strong>${client?.name || ''}</strong></p>
            ${client?.address ? `<p>${client.address}</p>` : ''}
          </div>

          <p><strong>Invoice: ${invoice?.invoiceNumber || ''}</strong></p>

          <table>
            <thead>
              <tr>
                <th style="width: 30px">No</th>
                <th>Keterangan</th>
                <th style="width: 60px" class="text-right">Jumlah</th>
                <th style="width: 80px">Tipe</th>
                <th style="width: 100px">Catatan</th>
              </tr>
            </thead>
            <tbody>
              ${(dnData.items || []).map((item: any, idx: number) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${item.invoiceItemDescription || item.description || ''}</td>
                  <td class="text-right">${item.deliveredQuantity}</td>
                  <td>${item.deliveryType === 'self_pickup' ? 'Diambil' : 'Dikirim'}</td>
                  <td>${item.remarks || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${deliveryNote.notes ? `<p style="margin-top: 10px;"><strong>Catatan:</strong> ${deliveryNote.notes}</p>` : ''}
          
          ${deliveryNote.vehicleInfo || deliveryNote.driverName ? `
            <p style="margin-top: 10px;">
              ${deliveryNote.vehicleInfo ? `Kendaraan: ${deliveryNote.vehicleInfo}` : ''}
              ${deliveryNote.vehicleInfo && deliveryNote.driverName ? ' | ' : ''}
              ${deliveryNote.driverName ? `Pengirim: ${deliveryNote.driverName}` : ''}
            </p>
          ` : ''}

          <div class="footer">
            <div class="signature-box">
              <p>Pengirim</p>
              <div class="signature-line">${deliveryNote.driverName || '_______________'}</div>
            </div>
            <div class="signature-box">
              <p>Penerima</p>
              <div class="signature-line">${deliveryNote.recipientName || '_______________'}</div>
            </div>
          </div>
        </body>
        </html>
      `;

      const frameDoc = printFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(printContent);
        frameDoc.close();
        
        printFrame.onload = () => {
          printFrame.contentWindow?.print();
          // Remove iframe after printing
          setTimeout(() => {
            document.body.removeChild(printFrame);
          }, 1000);
        };
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load delivery note for printing",
        variant: "destructive",
      });
    }
  };

  const handleAddPayment = () => {
    setEditingPayment(null);
    setPaymentForm({
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      paymentType: getDefaultPaymentType(),
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
      case 'void':
        return <Badge variant="outline" className="bg-slate-200 text-slate-600 line-through">Void</Badge>;
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

  const isEditable = invoice.status !== 'paid' && invoice.status !== 'void';

  return (
    <>
      {/* Print-only template */}
      <div className="print-only" style={{ display: 'none' }}>
        <div className="print-invoice-template">
          {/* Header - 4 column: logo | bill-to | company | doc-details */}
          <div className="print-header">
            {/* Logo column */}
            <div className="print-header-logo">
              <div className="print-logo">
                {currentUser?.logoUrl ? (
                  <img src={currentUser.logoUrl} alt="Company Logo" className="print-logo-image" />
                ) : (
                  <div className="print-logo-circle">
                    {currentUser?.companyName?.substring(0, 2).toUpperCase() || 'CO'}
                  </div>
                )}
              </div>
            </div>

            {/* Bill To column */}
            <div className="print-header-left">
              <div className="print-bill-to">
                <div className="print-bill-to-label" style={{ borderColor: printSettings?.accentColor || '#000' }}>Bill To</div>
                <div className="print-bill-to-name">{client?.name || 'N/A'}</div>
                {client && (
                  <div className="print-bill-to-details">
                    {client.email && <div>{client.email}</div>}
                    {client.phone && <div>{client.phone}</div>}
                    {client.address && <div>{client.address}</div>}
                  </div>
                )}
              </div>
            </div>
            
            {/* Company info column */}
            <div className="print-header-center">
              <div className="print-company-name">{currentUser?.companyName || "YOUR COMPANY NAME"}</div>
              {currentUser?.companyTagline && (
                <div className="print-company-tagline">{currentUser.companyTagline}</div>
              )}
              <div className="print-company-address">
                {currentUser?.companyAddress || "Your Company Address"}
                {currentUser?.companyPhone && <><br />Phone: {currentUser.companyPhone}</>}
              </div>
            </div>
            
          {/* Document details column */}
          <div className="print-header-right">
            <div className="print-doc-type">Invoice</div>
            <div className="print-doc-details">
              <div className="print-doc-row">
                <span className="print-doc-label">No.</span>
                <span className="print-doc-value">{invoice.invoiceNumber}</span>
              </div>
              <div className="print-doc-row">
                <span className="print-doc-label">Date</span>
                <span className="print-doc-value">{formatDate(invoice.issueDate)}</span>
              </div>
              <div className="print-doc-row">
                <span className="print-doc-label">Due</span>
                <span className="print-doc-value">{formatDate(invoice.dueDate)}</span>
              </div>
              {printSettings?.showPONumber !== false && (
                <div className="print-doc-row">
                  <span className="print-doc-label">PO #</span>
                  <span className="print-doc-value">{(invoice as any).poNumber || '_______'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Page indicator */}
          <div className="print-page-number">1/1</div>

          {/* Items Table */}
          <table className="print-items-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>QTY</th>
                <th>Rate</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td>{(item as any).productCode || (item as any).sku || `ITEM${index + 1}`}</td>
                  <td>{item.description}</td>
                  <td className="print-text-right">{item.quantity}</td>
                  <td className="print-text-right">{formatCurrency(parseFloat(item.unitPrice))}</td>
                  <td className="print-text-right">{formatCurrency(parseFloat(item.totalAmount))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="print-footer">
            <div className="print-footer-left">
              <div className="print-notes-label">Notes:</div>
              <div className="print-notes-text">
                {invoice.notes || currentUser?.invoiceNotes || currentUser?.defaultNotes || 'Items checked and verified upon delivery. Items cannot be returned.'}
              </div>
            </div>
            
            <div className="print-footer-right">
              {(invoice as any).shipping && parseFloat((invoice as any).shipping) > 0 && (
                <div className="print-total-row">
                  <span className="print-total-label">Shipping</span>
                  <span className="print-total-value">{formatCurrency(parseFloat((invoice as any).shipping))}</span>
                </div>
              )}
              <div className="print-total-row print-total-final">
                <span className="print-total-label">Total</span>
                <span className="print-total-value">{formatCurrency(parseFloat(invoice.totalAmount))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Screen view */}
      <div className="space-y-6 screen-only">
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
          
          <Button
            variant="outline"
            className="gap-1"
            onClick={handleDownloadPDF}
          >
            <FileDown className="h-4 w-4" />
            <span>Download PDF</span>
          </Button>
          
          <Button
            variant="outline"
            className="gap-1"
            onClick={() => window.print()}
            data-testid="button-print-invoice"
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
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
          
          {invoice.status !== 'void' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                  data-testid="button-void-invoice"
                >
                  <Ban className="h-4 w-4" />
                  <span>Void</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Void Invoice</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to void invoice {invoice.invoiceNumber}? This will make the invoice inactive and prevent any further edits. The invoice will remain visible for record-keeping purposes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => voidMutation.mutate()}
                    className="bg-red-600 hover:bg-red-700"
                    data-testid="button-confirm-void"
                  >
                    Void Invoice
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      
      {/* Invoice Content */}
      <Card>
        <Tabs defaultValue="details" className="w-full">
          <div className="border-b px-6 pt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Invoice Details</TabsTrigger>
              <TabsTrigger value="payments">
                Payments {invoicePayments.length > 0 && `(${invoicePayments.length})`}
              </TabsTrigger>
              <TabsTrigger value="delivery">
                Delivery {(deliveryNotes?.length || 0) > 0 && `(${deliveryNotes?.length})`}
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
                          {parseFloat(item.taxRate || '0') > 0 ? `${item.taxRate}%` : '—'}
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
                  <span className="text-gray-900">{formatCurrency(invoice.subtotal || '0')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">Tax:</span>
                  <span className="text-gray-900">{formatCurrency(invoice.taxAmount || '0')}</span>
                </div>
                {parseFloat(invoice.discount || '0') > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Discount:</span>
                    <span className="text-gray-900">-{formatCurrency(invoice.discount || '0')}</span>
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
                        {paymentTypes && paymentTypes.filter(pt => pt.isActive).length > 0 ? (
                          paymentTypes.filter(pt => pt.isActive).map((pt) => (
                            <SelectItem key={pt.id} value={pt.name}>{pt.name}</SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Check">Check</SelectItem>
                            <SelectItem value="Card">Card</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </>
                        )}
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

          <TabsContent value="delivery" className="m-0 p-6">
            <div className="space-y-6">
              {/* Delivery Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4">Delivery Summary</h3>
                <div className="space-y-3">
                  {deliveryStatus?.orderedItems.map((item) => {
                    const progress = item.quantity > 0 ? (item.delivered / item.quantity) * 100 : 0;
                    return (
                      <div key={item.invoiceItemId} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium truncate flex-1 mr-4">{item.description}</span>
                          <span className="text-gray-600 whitespace-nowrap">
                            {item.delivered} / {item.quantity}
                            {item.remaining > 0 && (
                              <span className="text-orange-600 ml-2">
                                ({item.remaining} remaining)
                              </span>
                            )}
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    );
                  })}
                </div>
                {deliveryStatus?.fullyDelivered ? (
                  <div className="mt-4 p-2 bg-green-100 text-green-800 rounded text-sm text-center">
                    <Package className="h-4 w-4 inline mr-2" />
                    All items have been delivered
                  </div>
                ) : (
                  <div className="mt-4 p-2 bg-orange-100 text-orange-800 rounded text-sm text-center">
                    <Truck className="h-4 w-4 inline mr-2" />
                    Pending delivery
                  </div>
                )}
              </div>

              {/* Delivery Notes List */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Delivery Notes</h3>
                  {!deliveryStatus?.fullyDelivered && (
                    <Button size="sm" onClick={initializeDeliveryForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Delivery Note
                    </Button>
                  )}
                </div>

                {(deliveryNotes?.length || 0) === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No delivery notes yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Delivery #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deliveryNotes?.map((dn) => (
                          <TableRow key={dn.id}>
                            <TableCell className="font-medium">{dn.deliveryNumber}</TableCell>
                            <TableCell>{formatDate(dn.deliveryDate)}</TableCell>
                            <TableCell>{dn.driverName || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={dn.status === 'delivered' ? 'default' : dn.status === 'cancelled' ? 'destructive' : 'secondary'}>
                                {dn.status === 'pending' ? 'Pending' : dn.status === 'delivered' ? 'Delivered' : 'Cancelled'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePrintDeliveryNote(dn)}
                                title="Print Delivery Note"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteDeliveryNoteMutation.mutate(dn.id)}
                                className="text-red-600 hover:text-red-700"
                                title="Delete Delivery Note"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>

            {/* Create Delivery Note Dialog */}
            <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Delivery Note</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
                      <Input
                        type="date"
                        value={deliveryForm.deliveryDate}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                      <Input
                        value={deliveryForm.driverName}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, driverName: e.target.value })}
                        placeholder="Driver name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Info</label>
                      <Input
                        value={deliveryForm.vehicleInfo}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, vehicleInfo: e.target.value })}
                        placeholder="Vehicle number/info"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name</label>
                      <Input
                        value={deliveryForm.recipientName}
                        onChange={(e) => setDeliveryForm({ ...deliveryForm, recipientName: e.target.value })}
                        placeholder="Recipient name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Items to Deliver</label>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right w-24">Remaining</TableHead>
                            <TableHead className="text-right w-24">Qty</TableHead>
                            <TableHead className="w-36">Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deliveryStatus?.orderedItems.filter(item => item.remaining > 0).map((item) => {
                            const formItem = deliveryForm.items.find(fi => fi.invoiceItemId === item.invoiceItemId);
                            return (
                              <TableRow key={item.invoiceItemId}>
                                <TableCell className="font-medium">{item.description}</TableCell>
                                <TableCell className="text-right">{item.remaining}</TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={item.remaining}
                                    step="0.01"
                                    className="w-20 text-right"
                                    value={formItem?.deliveredQuantity || '0'}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setDeliveryForm(prev => ({
                                        ...prev,
                                        items: prev.items.map(fi =>
                                          fi.invoiceItemId === item.invoiceItemId
                                            ? { ...fi, deliveredQuantity: value }
                                            : fi
                                        ).concat(
                                          prev.items.find(fi => fi.invoiceItemId === item.invoiceItemId)
                                            ? []
                                            : [{ invoiceItemId: item.invoiceItemId, deliveredQuantity: value, deliveryType: 'delivered', remarks: '' }]
                                        )
                                      }));
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <select
                                    className="w-full px-2 py-1 border rounded text-sm"
                                    value={formItem?.deliveryType || 'delivered'}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setDeliveryForm(prev => ({
                                        ...prev,
                                        items: prev.items.map(fi =>
                                          fi.invoiceItemId === item.invoiceItemId
                                            ? { ...fi, deliveryType: value }
                                            : fi
                                        ).concat(
                                          prev.items.find(fi => fi.invoiceItemId === item.invoiceItemId)
                                            ? []
                                            : [{ invoiceItemId: item.invoiceItemId, deliveredQuantity: '0', deliveryType: value, remarks: '' }]
                                        )
                                      }));
                                    }}
                                  >
                                    <option value="delivered">Dikirim</option>
                                    <option value="self_pickup">Diambil Sendiri</option>
                                  </select>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <Textarea
                      value={deliveryForm.notes}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, notes: e.target.value })}
                      rows={2}
                      placeholder="Optional notes..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeliveryDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeliverySubmit}
                    disabled={createDeliveryNoteMutation.isPending}
                  >
                    Create Delivery Note
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </Card>
      </div>
    </>
  );
}
