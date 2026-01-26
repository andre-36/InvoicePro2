import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Plus, Trash2, CreditCard, Banknote, Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import type { Invoice, InvoiceItem, Client, Product } from "@shared/schema";

type InvoiceWithItems = {
  invoice: Invoice;
  items: (InvoiceItem & { product: Product })[];
  client?: Client;
};

type ReturnItemData = {
  invoiceItemId: number;
  description: string;
  originalQty: number;
  quantity: number;
  price: number;
  subtotal: number;
  reason: string;
  selected: boolean;
};

const returnFormSchema = z.object({
  returnNumber: z.string().min(1, "Nomor retur wajib diisi"),
  returnDate: z.string().min(1, "Tanggal wajib diisi"),
  returnType: z.enum(['credit_note', 'refund']),
  notes: z.string().optional(),
});

type ReturnFormData = z.infer<typeof returnFormSchema>;

interface ReturnFormProps {
  onSuccess?: (returnId: number) => void;
}

export function ReturnForm({ onSuccess }: ReturnFormProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [invoiceSearchOpen, setInvoiceSearchOpen] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [returnItems, setReturnItems] = useState<ReturnItemData[]>([]);
  
  const form = useForm<ReturnFormData>({
    resolver: zodResolver(returnFormSchema),
    defaultValues: {
      returnNumber: "",
      returnDate: format(new Date(), 'yyyy-MM-dd'),
      returnType: 'credit_note',
      notes: "",
    },
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery<(Invoice & { clientName: string | null })[]>({
    queryKey: ['/api/stores/1/invoices'],
    staleTime: Infinity
  });

  const { data: invoiceWithItems, isLoading: invoiceItemsLoading } = useQuery<InvoiceWithItems>({
    queryKey: ['/api/invoices', selectedInvoiceId],
    enabled: !!selectedInvoiceId,
    staleTime: Infinity
  });

  const { data: nextNumber } = useQuery<{ returnNumber: string }>({
    queryKey: ['/api/next-return-number'],
    staleTime: 0
  });

  useEffect(() => {
    if (nextNumber?.returnNumber) {
      form.setValue('returnNumber', nextNumber.returnNumber);
    }
  }, [nextNumber, form]);

  useEffect(() => {
    if (invoiceWithItems?.items) {
      const items = invoiceWithItems.items.map(item => ({
        invoiceItemId: item.id,
        description: item.description,
        originalQty: Number(item.quantity),
        quantity: 0,
        price: Number(item.unitPrice),
        subtotal: 0,
        reason: "",
        selected: false,
      }));
      setReturnItems(items);
    }
  }, [invoiceWithItems]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/stores/1/returns', data);
    },
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores/1/returns'] });
      toast({
        title: "Retur berhasil dibuat",
        description: "Data retur telah tersimpan.",
      });
      const result = await response.json();
      if (onSuccess) {
        onSuccess(result.id);
      } else {
        navigate(`/returns/${result.id}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal membuat retur.",
        variant: "destructive",
      });
    },
  });

  const handleItemQuantityChange = (index: number, value: string) => {
    const qty = parseFloat(value) || 0;
    setReturnItems(prev => {
      const updated = [...prev];
      updated[index].quantity = Math.min(qty, updated[index].originalQty);
      updated[index].subtotal = updated[index].quantity * updated[index].price;
      updated[index].selected = updated[index].quantity > 0;
      return updated;
    });
  };

  const handleItemReasonChange = (index: number, value: string) => {
    setReturnItems(prev => {
      const updated = [...prev];
      updated[index].reason = value;
      return updated;
    });
  };

  const handleItemToggle = (index: number) => {
    setReturnItems(prev => {
      const updated = [...prev];
      updated[index].selected = !updated[index].selected;
      if (updated[index].selected && updated[index].quantity === 0) {
        updated[index].quantity = updated[index].originalQty;
        updated[index].subtotal = updated[index].quantity * updated[index].price;
      } else if (!updated[index].selected) {
        updated[index].quantity = 0;
        updated[index].subtotal = 0;
      }
      return updated;
    });
  };

  const selectedItems = returnItems.filter(item => item.selected && item.quantity > 0);
  const totalAmount = selectedItems.reduce((sum, item) => sum + item.subtotal, 0);

  const handleSubmit = async (formData: ReturnFormData) => {
    if (!selectedInvoiceId || !invoiceWithItems?.client) {
      toast({
        title: "Error",
        description: "Pilih invoice terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    if (selectedItems.length === 0) {
      toast({
        title: "Error",
        description: "Pilih minimal satu item untuk diretur.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      ...formData,
      invoiceId: selectedInvoiceId,
      clientId: invoiceWithItems.client.id,
      totalAmount: totalAmount.toString(),
      items: selectedItems.map(item => ({
        invoiceItemId: item.invoiceItemId,
        quantity: item.quantity.toString(),
        price: item.price.toString(),
        subtotal: item.subtotal.toString(),
        reason: item.reason || undefined,
      })),
    };

    createMutation.mutate(payload);
  };

  const filteredInvoices = invoices?.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
    inv.clientName?.toLowerCase().includes(invoiceSearch.toLowerCase())
  );

  const selectedInvoice = invoices?.find(inv => inv.id === selectedInvoiceId);

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/returns')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Buat Retur Baru</h1>
          <p className="text-muted-foreground">Buat retur barang dan credit note untuk pelanggan</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pilih Invoice</CardTitle>
                  <CardDescription>Pilih invoice yang akan diretur</CardDescription>
                </CardHeader>
                <CardContent>
                  <Popover open={invoiceSearchOpen} onOpenChange={setInvoiceSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {selectedInvoice ? (
                          <span>{selectedInvoice.invoiceNumber} - {selectedInvoice.clientName}</span>
                        ) : (
                          <span className="text-muted-foreground">Cari invoice...</span>
                        )}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Cari nomor invoice atau pelanggan..." 
                          value={invoiceSearch}
                          onValueChange={setInvoiceSearch}
                        />
                        <CommandList>
                          <CommandEmpty>Tidak ada invoice ditemukan.</CommandEmpty>
                          <CommandGroup>
                            {invoicesLoading ? (
                              <div className="p-2">
                                <Skeleton className="h-8 w-full" />
                              </div>
                            ) : (
                              filteredInvoices?.slice(0, 20).map((inv) => (
                                <CommandItem
                                  key={inv.id}
                                  value={`${inv.invoiceNumber} ${inv.clientName}`}
                                  onSelect={() => {
                                    setSelectedInvoiceId(inv.id);
                                    setInvoiceSearchOpen(false);
                                    setInvoiceSearch("");
                                  }}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{inv.invoiceNumber}</span>
                                    <span className="text-sm text-muted-foreground">{inv.clientName}</span>
                                  </div>
                                </CommandItem>
                              ))
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </CardContent>
              </Card>

              {selectedInvoiceId && (
                <Card>
                  <CardHeader>
                    <CardTitle>Item Retur</CardTitle>
                    <CardDescription>Pilih item dan jumlah yang akan diretur</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {invoiceItemsLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : returnItems.length === 0 ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>Invoice ini tidak memiliki item.</AlertDescription>
                      </Alert>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Produk</TableHead>
                            <TableHead className="text-right w-[80px]">Qty Asli</TableHead>
                            <TableHead className="text-right w-[100px]">Qty Retur</TableHead>
                            <TableHead className="text-right">Harga</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                            <TableHead className="w-[150px]">Alasan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {returnItems.map((item, index) => (
                            <TableRow key={item.invoiceItemId}>
                              <TableCell>
                                <Checkbox 
                                  checked={item.selected}
                                  onCheckedChange={() => handleItemToggle(index)}
                                />
                              </TableCell>
                              <TableCell>{item.description}</TableCell>
                              <TableCell className="text-right">{item.originalQty}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  max={item.originalQty}
                                  step="any"
                                  value={item.quantity || ''}
                                  onChange={(e) => handleItemQuantityChange(index, e.target.value)}
                                  className="w-20 text-right"
                                  disabled={!item.selected}
                                />
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                              <TableCell>
                                <Input
                                  placeholder="Alasan..."
                                  value={item.reason}
                                  onChange={(e) => handleItemReasonChange(index, e.target.value)}
                                  disabled={!item.selected}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detail Retur</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="returnNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nomor Retur</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="returnDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tanggal</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="returnType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipe Retur</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-2"
                          >
                            <div className="flex items-center space-x-2 border rounded-lg p-3">
                              <RadioGroupItem value="credit_note" id="credit_note" />
                              <Label htmlFor="credit_note" className="flex items-center gap-2 cursor-pointer flex-1">
                                <CreditCard className="h-4 w-4 text-blue-600" />
                                <div>
                                  <div className="font-medium">Credit Note</div>
                                  <div className="text-sm text-muted-foreground">Saldo tersimpan untuk pembayaran nanti</div>
                                </div>
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 border rounded-lg p-3">
                              <RadioGroupItem value="refund" id="refund" />
                              <Label htmlFor="refund" className="flex items-center gap-2 cursor-pointer flex-1">
                                <Banknote className="h-4 w-4 text-purple-600" />
                                <div>
                                  <div className="font-medium">Refund Tunai</div>
                                  <div className="text-sm text-muted-foreground">Pengembalian uang langsung</div>
                                </div>
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catatan</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Catatan tambahan..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ringkasan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {invoiceWithItems?.client && (
                    <div>
                      <div className="text-sm text-muted-foreground">Pelanggan</div>
                      <div className="font-medium">{invoiceWithItems.client.name}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-muted-foreground">Item Dipilih</div>
                    <div className="font-medium">{selectedItems.length} item</div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <div className="text-lg font-bold">Total Retur</div>
                      <div className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={createMutation.isPending || selectedItems.length === 0}
              >
                {createMutation.isPending ? "Menyimpan..." : "Simpan Retur"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
