import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Edit, FileDown, Trash2, FileEdit, Calendar, Building, Mail, Phone, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatCurrency } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface QuotationDetailPageProps {
  id: number;
}

type QuotationWithItems = {
  quotation: {
    id: number;
    quotationNumber: string;
    clientId: number;
    issueDate: string;
    expiryDate: string;
    status: string;
    subtotal: string;
    taxRate: string;
    taxAmount: string;
    discount: string;
    totalAmount: string;
    notes: string;
    convertedToInvoiceId?: number;
  };
  items: Array<{
    id: number;
    description: string;
    quantity: string;
    unitPrice: string;
    taxRate: string;
    taxAmount: string;
    discount: string;
    subtotal: string;
    totalAmount: string;
  }>;
  client?: {
    id: number;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
};

export default function QuotationDetailPage({ id }: QuotationDetailPageProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: quotationData, isLoading, error } = useQuery<QuotationWithItems>({
    queryKey: ['/api/quotations', id],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/quotations/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores/1/quotations'] });
      toast({
        title: "Quotation deleted",
        description: "The quotation has been deleted successfully.",
      });
      navigate("/quotations");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete quotation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('POST', `/api/quotations/${id}/convert`, {});
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores/1/quotations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Quotation converted",
        description: "The quotation has been converted to an invoice successfully.",
      });
      if (invoice?.id) {
        navigate(`/invoices/${invoice.id}`);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to convert quotation to invoice. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary';
      case 'sent':
        return 'default';
      case 'accepted':
        return 'success';
      case 'rejected':
        return 'destructive';
      case 'expired':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !quotationData) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-16">
        <h2 className="text-2xl font-semibold">Quotation not found</h2>
        <p className="text-muted-foreground">The quotation you're looking for doesn't exist or may have been deleted.</p>
        <Link href="/quotations">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quotations
          </Button>
        </Link>
      </div>
    );
  }

  const { quotation, items, client } = quotationData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" data-testid="quotation-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/quotations">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-quotation-number">
              {quotation.quotationNumber}
            </h1>
            <div className="flex items-center space-x-2">
              <Badge variant={getStatusBadgeVariant(quotation.status) as any}>
                {quotation.status}
              </Badge>
              {quotation.convertedToInvoiceId && (
                <Badge variant="outline">
                  Converted to Invoice
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            data-testid="button-print-quotation"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>

          {quotation.status !== 'accepted' && !quotation.convertedToInvoiceId && (
            <Button
              onClick={() => convertMutation.mutate(quotation.id)}
              disabled={convertMutation.isPending}
              data-testid="button-convert-to-invoice"
            >
              <FileEdit className="mr-2 h-4 w-4" />
              Convert to Invoice
            </Button>
          )}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" data-testid="button-delete-quotation">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this quotation? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate(quotation.id)}
                  disabled={deleteMutation.isPending}
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quotation Details */}
          <Card>
            <CardHeader>
              <CardTitle>Quotation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Issue Date</p>
                  <p className="font-medium" data-testid="text-issue-date">
                    {formatDate(quotation.issueDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expiry Date</p>
                  <p className="font-medium" data-testid="text-expiry-date">
                    {formatDate(quotation.expiryDate)}
                  </p>
                </div>
              </div>
              
              {quotation.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm" data-testid="text-notes">{quotation.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id || index} data-testid={`row-item-${index}`}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right" data-testid={`text-unit-price-${index}`}>
                        {formatCurrency(parseFloat(item.unitPrice))}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-tax-${index}`}>
                        {formatCurrency(parseFloat(item.taxAmount || '0'))}
                      </TableCell>
                      <TableCell className="text-right font-medium" data-testid={`text-total-${index}`}>
                        {formatCurrency(parseFloat(item.totalAmount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator className="my-4" />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span data-testid="text-subtotal">{formatCurrency(parseFloat(quotation.subtotal))}</span>
                </div>
                {parseFloat(quotation.taxAmount || '0') > 0 && (
                  <div className="flex justify-between">
                    <span>Tax ({quotation.taxRate}%):</span>
                    <span data-testid="text-tax-amount">{formatCurrency(parseFloat(quotation.taxAmount))}</span>
                  </div>
                )}
                {parseFloat(quotation.discount || '0') > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span data-testid="text-discount">-{formatCurrency(parseFloat(quotation.discount))}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span data-testid="text-total-amount">{formatCurrency(parseFloat(quotation.totalAmount))}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Information */}
          {client && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="mr-2 h-4 w-4" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium" data-testid="text-client-name">{client.name}</p>
                </div>
                
                {client.email && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="mr-2 h-3 w-3" />
                    <span data-testid="text-client-email">{client.email}</span>
                  </div>
                )}
                
                {client.phone && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="mr-2 h-3 w-3" />
                    <span data-testid="text-client-phone">{client.phone}</span>
                  </div>
                )}
                
                {client.address && (
                  <div className="text-sm text-muted-foreground">
                    <p data-testid="text-client-address">{client.address}</p>
                    {client.city && (
                      <p>
                        {client.city}
                        {client.postalCode && `, ${client.postalCode}`}
                      </p>
                    )}
                    {client.country && <p>{client.country}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quotation.convertedToInvoiceId && (
                <Link href={`/invoices/${quotation.convertedToInvoiceId}`}>
                  <Button variant="outline" className="w-full justify-start">
                    <FileEdit className="mr-2 h-4 w-4" />
                    View Converted Invoice
                  </Button>
                </Link>
              )}
              
              <Link href="/quotations">
                <Button variant="outline" className="w-full justify-start">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Quotations
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}