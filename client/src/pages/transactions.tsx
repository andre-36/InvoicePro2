import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, DollarSign, ArrowUpCircle, ArrowDownCircle, Download, Wallet, Lock, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTransactionSchema, type Transaction, type InsertTransaction, type CashAccount, type InflowCategory, type OutflowCategory } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useStore } from '@/lib/store-context';

const transactionFormSchema = insertTransactionSchema.extend({
  date: z.string().min(1, "Date is required"),
  amount: z.string().min(1, "Amount is required"),
  accountId: z.number().nullable().optional(),
});

type TransactionFormData = z.infer<typeof transactionFormSchema>;

const PAGE_SIZE = 10;

export default function TransactionsPage() {
  const { currentStoreId } = useStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportType, setExportType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: [`/api/stores/${currentStoreId}/transactions`],
  });

  const { data: cashAccounts } = useQuery<CashAccount[]>({
    queryKey: [`/api/stores/${currentStoreId}/cash-accounts`],
  });

  const { data: inflowCategories } = useQuery<InflowCategory[]>({
    queryKey: [`/api/stores/${currentStoreId}/inflow-categories`],
  });

  const { data: outflowCategories } = useQuery<OutflowCategory[]>({
    queryKey: [`/api/stores/${currentStoreId}/outflow-categories`],
  });

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      storeId: currentStoreId,
      type: "income",
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: "",
      description: "",
      category: "",
      referenceNumber: "",
      accountId: null,
    },
  });
  
  const transactionMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: number, data: TransactionFormData }) => {
      const payload: InsertTransaction = {
        ...data,
        amount: data.amount,
        category: data.category || null,
        referenceNumber: data.referenceNumber || null,
        invoiceId: editingTransaction?.invoiceId ?? null,
        accountId: data.accountId || null,
      };
      
      if (id) {
        return apiRequest('PUT', `/api/transactions/${id}`, payload);
      } else {
        return apiRequest('POST', '/api/transactions', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/stores/${currentStoreId}/transactions`] });
      setIsDialogOpen(false);
      setEditingTransaction(null);
      form.reset({
        storeId: currentStoreId,
        type: "income",
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: "",
        description: "",
        category: "",
        referenceNumber: "",
        accountId: null,
      });
      toast({
        title: editingTransaction ? "Transaction updated" : "Transaction created",
        description: editingTransaction 
          ? "The transaction has been updated successfully." 
          : "The transaction has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/stores/${currentStoreId}/transactions`] });
      setDeletingTransaction(null);
      toast({
        title: "Transaction deleted",
        description: "The transaction has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    form.reset({
      storeId: transaction.storeId,
      type: transaction.type,
      date: transaction.date,
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category ?? "",
      referenceNumber: transaction.referenceNumber ?? "",
      accountId: transaction.accountId ?? null,
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingTransaction(null);
    form.reset({
      storeId: currentStoreId,
      type: "income",
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: "",
      description: "",
      category: "",
      referenceNumber: "",
      accountId: null,
    });
    setIsDialogOpen(true);
  };
  
  const getCashAccountName = (accountId: number | null | undefined) => {
    if (!accountId || !cashAccounts) return '-';
    const account = cashAccounts.find(a => a.id === accountId);
    return account?.name || '-';
  };

  const onSubmit = (data: TransactionFormData) => {
    transactionMutation.mutate({
      id: editingTransaction?.id,
      data,
    });
  };

  const handleDelete = () => {
    if (deletingTransaction) {
      deleteMutation.mutate(deletingTransaction.id);
    }
  };

  const isLinkedTransaction = (transaction: Transaction) => {
    return !!(transaction.invoiceId || transaction.invoicePaymentId || 
              transaction.goodsReceiptId || transaction.goodsReceiptPaymentId || 
              transaction.purchaseOrderPaymentId || transaction.returnId);
  };

  const getLinkedSource = (transaction: Transaction) => {
    if (transaction.invoiceId || transaction.invoicePaymentId) return 'Invoice';
    if (transaction.goodsReceiptId || transaction.goodsReceiptPaymentId) return 'Goods Receipt';
    if (transaction.purchaseOrderPaymentId) return 'Purchase Order';
    if (transaction.returnId) return 'Return';
    return 'Dokumen';
  };

  // Handle export to Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      
      const params = new URLSearchParams();
      params.append('storeId', '1');
      if (exportStartDate) params.append('startDate', exportStartDate);
      if (exportEndDate) params.append('endDate', exportEndDate);
      if (exportType) params.append('type', exportType);
      
      const response = await fetch(`/api/transactions/export/xlsx?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to export transactions');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transaksi-${exportStartDate || 'all'}-to-${exportEndDate || 'all'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Berhasil",
        description: "File Excel telah didownload",
      });
      
      setExportDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal export transaksi",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(t => {
      const matchesType = typeFilter === "all" || t.type === typeFilter;

      const matchesSearch = !searchQuery ||
        (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.referenceNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

      const txDate = t.date ? format(new Date(t.date), 'yyyy-MM-dd') : '';
      const matchesDateFrom = !dateFrom || txDate >= dateFrom;
      const matchesDateTo = !dateTo || txDate <= dateTo;

      return matchesType && matchesSearch && matchesDateFrom && matchesDateTo;
    });
  }, [transactions, typeFilter, searchQuery, dateFrom, dateTo]);

  const totalCount = filteredTransactions.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const paginatedTransactions = totalCount > PAGE_SIZE
    ? filteredTransactions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : filteredTransactions;

  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const netBalance = totalIncome - totalExpenses;

  useEffect(() => {
    if (currentPage > 1 && currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Transactions</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage income and expense transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button onClick={handleAdd} data-testid="button-add-transaction">
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Income</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-500">{formatCurrency(totalIncome)}</p>
              </div>
              <ArrowUpCircle className="h-10 w-10 text-green-600 dark:text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-500">{formatCurrency(totalExpenses)}</p>
              </div>
              <ArrowDownCircle className="h-10 w-10 text-red-600 dark:text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Net Balance</p>
                <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>
                  {formatCurrency(netBalance)}
                </p>
              </div>
              <DollarSign className={`h-10 w-10 ${netBalance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-3">
            <CardTitle>All Transactions</CardTitle>
            {totalCount > 0 && (
              <span className="text-sm text-muted-foreground">{totalCount} records</span>
            )}
          </div>
          <div className="flex flex-col md:flex-row flex-wrap gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search description, category..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium whitespace-nowrap">Type:</Label>
              <Select value={typeFilter} onValueChange={(val: any) => { setTypeFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium whitespace-nowrap">From:</Label>
              <Input
                type="date"
                className="w-[160px]"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium whitespace-nowrap">To:</Label>
              <Input
                type="date"
                className="w-[160px]"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
              />
            </div>
            {(searchQuery || typeFilter !== "all" || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearchQuery(""); setTypeFilter("all"); setDateFrom(""); setDateTo(""); setCurrentPage(1); }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No transactions</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {(searchQuery || typeFilter !== "all" || dateFrom || dateTo)
                  ? "No transactions match your filter criteria. Try adjusting your filters."
                  : "Get started by creating a new transaction."}
              </p>
              {!(searchQuery || typeFilter !== "all" || dateFrom || dateTo) && (
                <div className="mt-6">
                  <Button onClick={handleAdd} data-testid="button-add-first-transaction">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Transaction
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {totalCount > PAGE_SIZE ? (
                <ScrollArea className="h-[480px]">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Cash Account</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTransactions.map((transaction) => (
                          <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                            <TableCell className="font-medium">
                              <div>{format(new Date(transaction.date), 'MMM dd, yyyy')}</div>
                              {transaction.createdAt && (
                                <div className="text-xs text-gray-500">{format(new Date(transaction.createdAt), 'HH:mm')}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={transaction.type === 'income' ? 'default' : 'destructive'}
                                className={transaction.type === 'income' ? 'bg-green-600 hover:bg-green-700' : ''}
                              >
                                {transaction.type === 'income' ? (
                                  <ArrowUpCircle className="h-3 w-3 mr-1" />
                                ) : (
                                  <ArrowDownCircle className="h-3 w-3 mr-1" />
                                )}
                                {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                            <TableCell>{transaction.category || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Wallet className="h-3 w-3 text-gray-400" />
                                {getCashAccountName(transaction.accountId)}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-500 dark:text-gray-400">{transaction.referenceNumber || '-'}</TableCell>
                            <TableCell className={`text-right font-semibold ${transaction.type === 'income' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(parseFloat(transaction.amount))}
                            </TableCell>
                            <TableCell className="text-right">
                              {isLinkedTransaction(transaction) ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex justify-end items-center gap-1 text-gray-400">
                                        <Lock className="h-3.5 w-3.5" />
                                        <span className="text-xs">{getLinkedSource(transaction)}</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Transaksi ini dibuat dari {getLinkedSource(transaction)}.</p>
                                      <p>Edit/hapus hanya dari dokumen asalnya.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(transaction)}
                                    data-testid={`button-edit-${transaction.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeletingTransaction(transaction)}
                                    data-testid={`button-delete-${transaction.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
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
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Cash Account</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTransactions.map((transaction) => (
                        <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                          <TableCell className="font-medium">
                            <div>{format(new Date(transaction.date), 'MMM dd, yyyy')}</div>
                            {transaction.createdAt && (
                              <div className="text-xs text-gray-500">{format(new Date(transaction.createdAt), 'HH:mm')}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={transaction.type === 'income' ? 'default' : 'destructive'}
                              className={transaction.type === 'income' ? 'bg-green-600 hover:bg-green-700' : ''}
                            >
                              {transaction.type === 'income' ? (
                                <ArrowUpCircle className="h-3 w-3 mr-1" />
                              ) : (
                                <ArrowDownCircle className="h-3 w-3 mr-1" />
                              )}
                              {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                          <TableCell>{transaction.category || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Wallet className="h-3 w-3 text-gray-400" />
                              {getCashAccountName(transaction.accountId)}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-500 dark:text-gray-400">{transaction.referenceNumber || '-'}</TableCell>
                          <TableCell className={`text-right font-semibold ${transaction.type === 'income' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(parseFloat(transaction.amount))}
                          </TableCell>
                          <TableCell className="text-right">
                            {isLinkedTransaction(transaction) ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex justify-end items-center gap-1 text-gray-400">
                                      <Lock className="h-3.5 w-3.5" />
                                      <span className="text-xs">{getLinkedSource(transaction)}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Transaksi ini dibuat dari {getLinkedSource(transaction)}.</p>
                                    <p>Edit/hapus hanya dari dokumen asalnya.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(transaction)}
                                  data-testid={`button-edit-${transaction.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingTransaction(transaction)}
                                  data-testid={`button-delete-${transaction.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
            </DialogTitle>
            <DialogDescription>
              {editingTransaction
                ? 'Update the transaction details below.'
                : 'Enter the transaction details below.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={(val) => { field.onChange(val); form.setValue("category", ""); }} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field} 
                        data-testid="input-amount" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cash Account (Optional)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))} 
                      value={field.value ? String(field.value) : "none"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-cash-account">
                          <SelectValue placeholder="Select cash account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No account selected</SelectItem>
                        {cashAccounts?.map((account) => (
                          <SelectItem key={account.id} value={String(account.id)}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter transaction description" 
                        {...field} 
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => {
                  const selectedType = form.watch("type");
                  const categories = selectedType === "income" 
                    ? (inflowCategories?.filter(c => c.isActive) || [])
                    : (outflowCategories?.filter(c => c.isActive) || []);
                  return (
                    <FormItem>
                      <FormLabel>Category (Optional)</FormLabel>
                      <Select
                        value={field.value || ""}
                        onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="input-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">— No Category —</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., INV-001, PO-001" 
                        {...field}
                        value={field.value || ""}
                        data-testid="input-reference"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={transactionMutation.isPending}
                  data-testid="button-save"
                >
                  {transactionMutation.isPending ? 'Saving...' : editingTransaction ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTransaction} onOpenChange={() => setDeletingTransaction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the transaction. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Export Transaksi ke Excel</DialogTitle>
            <DialogDescription>
              Pilih rentang tanggal dan tipe transaksi untuk export
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Dari Tanggal</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Sampai Tanggal</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exportType">Tipe Transaksi</Label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tipe transaksi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="income">Pemasukan</SelectItem>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleExportExcel} disabled={isExporting}>
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Download Excel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
