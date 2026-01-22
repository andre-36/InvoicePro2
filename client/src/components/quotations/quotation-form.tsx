import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Save, Check, Plus, Trash2, ChevronsUpDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertQuotationSchema } from "@shared/schema";
import { QuotationItemRow } from "@/components/quotations/quotation-item-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

// Extend the schema for client-side validation
const extendedQuotationSchema = insertQuotationSchema.extend({
  issueDate: z.date(),
  expiryDate: z.date().optional().nullable(),
  // Using string representation for numeric fields to work with form inputs
  subtotal: z.string().optional(),
  taxAmount: z.string().optional(),
  discount: z.string().optional(),
  totalAmount: z.string().optional(),
});

// Schema for quotation items
const quotationItemSchema = z.object({
  id: z.number().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.string().min(1, "Quantity is required"),
  unitPrice: z.string().min(1, "Price is required"),
  taxRate: z.string().optional(),
  subtotal: z.string().optional(),
  taxAmount: z.string().optional(),
  totalAmount: z.string().optional(),
  productId: z.number().nullable().optional(),
});

// Schema for the complete form
const quotationFormSchema = z.object({
  quotation: extendedQuotationSchema,
  items: z.array(quotationItemSchema).min(1, "At least one item is required"),
});

type QuotationFormValues = z.infer<typeof quotationFormSchema>;
type QuotationItem = z.infer<typeof quotationItemSchema>;

interface QuotationFormProps {
  quotationId?: number;
  onSuccess?: () => void;
}

export function QuotationForm({ quotationId, onSuccess }: QuotationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<QuotationItem[]>([
    {
      id: undefined,
      description: "",
      quantity: "1",
      unitPrice: "0",
      taxRate: "0",
      subtotal: "0",
      taxAmount: "0",
      totalAmount: "0",
      productId: null
    }
  ]);
  
  // Client combobox state
  const [clientComboboxOpen, setClientComboboxOpen] = useState(false);

  // Fetch clients for the dropdown
  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
  });

  // Fetch products for product selection
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
  });

  // Fetch current user for default notes and tax rate
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/user'],
  });

  // If editing an existing quotation, fetch its data
  const { data: quotationData, isLoading: isLoadingQuotation } = useQuery({
    queryKey: ['/api/quotations', quotationId],
    enabled: !!quotationId,
  });

  // For new quotations, fetch the next quotation number preview with fallback
  const { data: nextQuotationNumberData, isError: isNumberError } = useQuery({
    queryKey: ['/api/quotations/next-number'],
    enabled: !quotationId, // Only for new quotations
  });
  
  // Generate fallback number if API fails
  const generateFallbackQuotationNumber = () => {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    return `QUO-${year}${month}-0001`;
  };
  
  const nextQuotationNumber = nextQuotationNumberData?.quotationNumber || 
    (isNumberError ? generateFallbackQuotationNumber() : null);

  // Form setup - expiry date is empty by default (prices can change anytime)
  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      quotation: {
        clientId: 0,
        storeId: 1, // Default store
        issueDate: new Date(),
        expiryDate: null,
        status: "draft",
        subtotal: "0",
        taxRate: "0",
        taxAmount: "0",
        discount: "0",
        totalAmount: "0",
        notes: "",
        useFakturPajak: false
      },
      items: items
    }
  });

  // Watch the useFakturPajak toggle
  const useFakturPajak = form.watch('quotation.useFakturPajak');
  
  // Get the global tax rate from user settings
  const globalTaxRate = currentUser?.defaultTaxRate || 11;

  // Create/update quotation mutation
  const mutation = useMutation({
    mutationFn: async (values: QuotationFormValues) => {
      // Format dates as ISO strings (expiryDate is optional)
      const formattedValues = {
        ...values,
        quotation: {
          ...values.quotation,
          issueDate: values.quotation.issueDate.toISOString(),
          expiryDate: values.quotation.expiryDate ? values.quotation.expiryDate.toISOString() : null,
        }
      };

      if (quotationId) {
        return apiRequest('PUT', `/api/quotations/${quotationId}`, formattedValues);
      } else {
        return apiRequest('POST', '/api/quotations', formattedValues);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores/1/quotations'] });
      if (quotationId) {
        queryClient.invalidateQueries({ queryKey: ['/api/quotations', quotationId] });
      }
      toast({
        title: quotationId ? "Quotation updated" : "Quotation created",
        description: `The quotation has been ${quotationId ? 'updated' : 'created'} successfully.`,
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to save quotation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Client-side number generation is no longer needed since server generates numbers automatically

  // Load existing quotation data for editing
  useEffect(() => {
    if (quotationData && quotationId && typeof quotationData === 'object' && 'quotation' in quotationData) {
      const { quotation, items: quotationItems } = quotationData;
      
      // Set quotation data
      form.reset({
        quotation: {
          ...quotation,
          issueDate: new Date(quotation.issueDate),
          expiryDate: quotation.expiryDate ? new Date(quotation.expiryDate) : null,
          subtotal: quotation.subtotal,
          taxAmount: quotation.taxAmount,
          discount: quotation.discount,
          totalAmount: quotation.totalAmount,
        },
        items: quotationItems.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || "0",
          subtotal: item.subtotal,
          taxAmount: item.taxAmount || "0",
          totalAmount: item.totalAmount,
          productId: item.productId
        }))
      });

      setItems(quotationItems.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || "0",
        subtotal: item.subtotal,
        taxAmount: item.taxAmount || "0",
        totalAmount: item.totalAmount,
        productId: item.productId
      })));
    }
  }, [quotationData, quotationId, form]);

  const addItem = () => {
    const newItem: QuotationItem = {
      id: undefined,
      description: "",
      quantity: "1",
      unitPrice: "0",
      taxRate: "0",
      subtotal: "0",
      taxAmount: "0",
      totalAmount: "0",
      productId: null
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    form.setValue('items', newItems);
    calculateTotals(newItems);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      toast({
        title: "Cannot remove item",
        description: "At least one item is required.",
        variant: "destructive",
      });
      return;
    }
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    form.setValue('items', newItems);
    calculateTotals(newItems);
  };

  const updateItem = (index: number, updatedItem: QuotationItem) => {
    const newItems = [...items];
    newItems[index] = updatedItem;
    setItems(newItems);
    form.setValue('items', newItems);
    calculateTotals(newItems);
  };

  const calculateTotals = (currentItems: QuotationItem[]) => {
    const isFakturPajak = form.getValues('quotation.useFakturPajak');
    const taxRate = globalTaxRate;
    
    // Calculate totals based on whether faktur pajak is active
    // When faktur pajak is active, prices include tax and we need to split them
    // When inactive, prices are shown as-is without tax separation
    
    let subtotal = 0;
    let taxAmount = 0;
    
    if (isFakturPajak) {
      // Tax-inclusive pricing: stored prices include tax
      // DPP (base price) = fullPrice / (1 + taxRate/100)
      // PPN = fullPrice - DPP
      currentItems.forEach(item => {
        const fullPrice = parseFloat(item.subtotal || "0");
        const basePrice = fullPrice / (1 + taxRate / 100);
        const itemTax = fullPrice - basePrice;
        subtotal += basePrice;
        taxAmount += itemTax;
      });
    } else {
      // No tax separation - show full price only
      subtotal = currentItems.reduce((sum, item) => {
        return sum + parseFloat(item.subtotal || "0");
      }, 0);
      taxAmount = 0;
    }

    const discountAmount = parseFloat(form.getValues('quotation.discount') || "0");
    const total = subtotal + taxAmount - discountAmount;

    form.setValue('quotation.subtotal', subtotal.toString());
    form.setValue('quotation.taxAmount', taxAmount.toString());
    form.setValue('quotation.taxRate', taxRate.toString());
    form.setValue('quotation.totalAmount', Math.max(0, total).toString());
  };

  const onSubmit = (values: QuotationFormValues) => {
    mutation.mutate(values);
  };

  if (isLoadingQuotation) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="quotation-form">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {quotationId ? "Edit Quotation" : "Create New Quotation"}
          </h1>
          <p className="text-muted-foreground">
            {quotationId ? "Update quotation details" : "Create a new quotation for your client"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Quotation Header */}
          <Card>
            <CardHeader>
              <CardTitle>Quotation Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormLabel>Quotation Number</FormLabel>
                  <Input 
                    value={quotationId ? (quotationData?.quotation?.quotationNumber ?? "") : (nextQuotationNumber || generateFallbackQuotationNumber())}
                    readOnly 
                    className="bg-gray-50 dark:bg-gray-800" 
                    data-testid="input-quotation-number"
                  />
                </div>

                <FormField
                  control={form.control}
                  name="quotation.clientId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Client</FormLabel>
                      <Popover open={clientComboboxOpen} onOpenChange={setClientComboboxOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={clientComboboxOpen}
                              className="w-full justify-between font-normal"
                              data-testid="button-select-client"
                            >
                              {field.value && field.value !== 0
                                ? (() => {
                                    const client = Array.isArray(clients) ? clients.find((c: any) => c.id === field.value) : null;
                                    return client ? `${client.clientNumber ? `[${client.clientNumber}] ` : ''}${client.name}` : '';
                                  })()
                                : "Select a client"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search clients..." data-testid="input-search-client" />
                            <CommandList>
                              <CommandEmpty>No client found.</CommandEmpty>
                              <CommandGroup>
                                {Array.isArray(clients) && clients.map((client: any) => (
                                  <CommandItem
                                    key={client.id}
                                    value={`${client.clientNumber || ''} ${client.name}`}
                                    onSelect={() => {
                                      field.onChange(client.id);
                                      setClientComboboxOpen(false);
                                    }}
                                    data-testid={`client-option-${client.id}`}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        field.value === client.id ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    {client.clientNumber && <span className="text-gray-500 mr-2">[{client.clientNumber}]</span>}
                                    {client.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quotation.issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                          data-testid="input-issue-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quotation.expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                          data-testid="input-expiry-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="quotation.notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional notes or terms..."
                        {...field}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <QuotationItemRow
                    key={index}
                    item={item}
                    index={index}
                    products={(products || []).filter(p => p.isActive !== false)}
                    onUpdate={updateItem}
                    onRemove={() => removeItem(index)}
                    canRemove={items.length > 1}
                  />
                ))}
                {/* Add Item button at the bottom */}
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={addItem} 
                  className="w-full text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-dashed border-gray-300"
                  data-testid="button-add-item"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Faktur Pajak Toggle */}
                <FormField
                  control={form.control}
                  name="quotation.useFakturPajak"
                  render={({ field }) => (
                    <div className="flex justify-between items-center py-2 border-b mb-2">
                      <div>
                        <span className="font-medium">Faktur Pajak</span>
                        <p className="text-xs text-muted-foreground">Tampilkan DPP + PPN terpisah</p>
                      </div>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          setTimeout(() => calculateTotals(items), 0);
                        }}
                      />
                    </div>
                  )}
                />

                {useFakturPajak ? (
                  <>
                    {/* DPP (Base Price) - when faktur pajak is active */}
                    <div className="flex justify-between">
                      <span>DPP (Dasar Pengenaan Pajak):</span>
                      <span data-testid="text-subtotal">
                        {formatCurrency(parseFloat(form.watch('quotation.subtotal') || '0'))}
                      </span>
                    </div>
                    
                    {/* PPN (Tax) - when faktur pajak is active */}
                    <div className="flex justify-between">
                      <span>PPN ({globalTaxRate}%):</span>
                      <span data-testid="text-tax">
                        {formatCurrency(parseFloat(form.watch('quotation.taxAmount') || '0'))}
                      </span>
                    </div>
                  </>
                ) : (
                  /* Full price only when faktur pajak is inactive */
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span data-testid="text-subtotal">
                      {formatCurrency(parseFloat(form.watch('quotation.subtotal') || '0'))}
                    </span>
                  </div>
                )}
                
                <FormField
                  control={form.control}
                  name="quotation.discount"
                  render={({ field }) => (
                    <div className="flex justify-between items-center">
                      <span>Discount:</span>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="w-24 text-right"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            setTimeout(() => calculateTotals(items), 0);
                          }}
                          data-testid="input-discount"
                        />
                      </div>
                    </div>
                  )}
                />

                <div className="border-t pt-2">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span data-testid="text-total">
                      {formatCurrency(parseFloat(form.watch('quotation.totalAmount') || '0'))}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => window.history.back()}
                data-testid="button-cancel"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                data-testid="button-save"
              >
                {mutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {quotationId ? "Update Quotation" : "Create Quotation"}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}