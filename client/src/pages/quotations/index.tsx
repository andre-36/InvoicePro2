import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Filter, ArrowUpDown, MoreHorizontal, FileDown, Eye, FilePenLine, Trash2, FileEdit } from "lucide-react";
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

type Quotation = {
  id: number;
  quotationNumber: string;
  clientName: string;
  issueDate: string;
  expiryDate: string;
  totalAmount: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  convertedToInvoiceId?: number;
};

type QuotationStatus = 'all' | 'draft' | 'sent' | 'converted' | 'rejected' | 'expired';

export default function QuotationsPage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuotationStatus>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: quotations, isLoading } = useQuery<Quotation[]>({
    queryKey: ['/api/stores/1/quotations'],
  });

  // Delete quotation mutation
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
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete quotation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Convert to invoice mutation
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
      // Navigate to the invoices page
      navigate("/invoices");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to convert quotation to invoice. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadgeVariant = (status: string, convertedToInvoiceId?: number | null) => {
    if (convertedToInvoiceId || status === 'accepted') return 'success';
    switch (status) {
      case 'draft':
        return 'secondary';
      case 'sent':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'expired':
        return 'outline';
      default:
        return 'secondary';
    }
  };
  
  const getStatusLabel = (status: string, convertedToInvoiceId?: number | null) => {
    if (convertedToInvoiceId || status === 'accepted') return 'Converted';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const filteredQuotations = quotations?.filter((quotation) => {
    const matchesSearch = 
      quotation.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (quotation.clientName?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    let matchesStatus = statusFilter === 'all';
    if (!matchesStatus) {
      if (statusFilter === 'converted') {
        matchesStatus = !!quotation.convertedToInvoiceId || quotation.status === 'accepted';
      } else {
        matchesStatus = quotation.status === statusFilter && !quotation.convertedToInvoiceId && quotation.status !== 'accepted';
      }
    }
    return matchesSearch && matchesStatus;
  }) || [];

  const stats = {
    total: quotations?.length || 0,
    draft: quotations?.filter(q => q.status === 'draft' && !q.convertedToInvoiceId).length || 0,
    sent: quotations?.filter(q => q.status === 'sent' && !q.convertedToInvoiceId).length || 0,
    converted: quotations?.filter(q => q.convertedToInvoiceId || q.status === 'accepted').length || 0,
    rejected: quotations?.filter(q => q.status === 'rejected').length || 0,
    expired: quotations?.filter(q => q.status === 'expired' && !q.convertedToInvoiceId).length || 0,
  };

  return (
    <div className="space-y-6" data-testid="quotations-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotations</h1>
          <p className="text-muted-foreground">Manage your quotations and convert them to invoices</p>
        </div>
        <Link href="/quotations/create">
          <Button data-testid="button-create-quotation">
            <Plus className="mr-2 h-4 w-4" />
            New Quotation
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-draft">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-sent">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-converted">{stats.converted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-rejected">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-expired">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Quotations</CardTitle>
          <CardDescription>
            A list of all your quotations with the ability to manage them
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                data-testid="input-search-quotations"
                placeholder="Search quotations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: QuotationStatus) => setStatusFilter(value)}>
              <SelectTrigger data-testid="select-status-filter" className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation Number</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No quotations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuotations.map((quotation) => (
                    <TableRow key={quotation.id} data-testid={`row-quotation-${quotation.id}`}>
                      <TableCell className="font-medium">
                        <Link href={`/quotations/${quotation.id}`} className="hover:underline">
                          {quotation.quotationNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{quotation.clientName || 'N/A'}</TableCell>
                      <TableCell>{formatDate(quotation.issueDate)}</TableCell>
                      <TableCell>{formatDate(quotation.expiryDate)}</TableCell>
                      <TableCell data-testid={`text-amount-${quotation.id}`}>
                        {formatCurrency(parseFloat(quotation.totalAmount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(quotation.status, quotation.convertedToInvoiceId) as any}>
                          {getStatusLabel(quotation.status, quotation.convertedToInvoiceId)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              className="h-8 w-8 p-0"
                              data-testid={`button-actions-${quotation.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <Link href={`/quotations/${quotation.id}`}>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuSeparator />
                            {quotation.status !== 'accepted' && !quotation.convertedToInvoiceId && (
                              <DropdownMenuItem
                                onClick={() => convertMutation.mutate(quotation.id)}
                                disabled={convertMutation.isPending}
                                data-testid={`button-convert-${quotation.id}`}
                              >
                                <FileEdit className="mr-2 h-4 w-4" />
                                Convert to Invoice
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-red-600 focus:text-red-600"
                                  data-testid={`button-delete-trigger-${quotation.id}`}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete quotation {quotation.quotationNumber}? 
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(quotation.id)}
                                    disabled={deleteMutation.isPending}
                                    className="bg-red-600 hover:bg-red-700"
                                    data-testid={`button-delete-confirm-${quotation.id}`}
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
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}