import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Save, Check, Plus, Trash2, ArrowLeft, Printer } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertInvoiceSchema } from "@shared/schema";
import { InvoiceItemRow } from "@/components/invoices/invoice-item-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { generatePDF } from "@/lib/pdf-generator";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

// Extend the schema for client-side validation
const extendedInvoiceSchema = insertInvoiceSchema.extend({
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  // Using string representation for numeric fields to work with form inputs
  subtotal: z.string().optional(),
  tax: z.string().optional(),
  discount: z.string().optional(),
  total: z.string().optional(),
});

// For editing existing invoices, we need to include the invoice number for display
const editingInvoiceSchema = extendedInvoiceSchema.extend({
  invoiceNumber: z.string(),
});

// Schema for invoice items
const invoiceItemSchema = z.object({
  id: z.number().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.string().min(1, "Quantity is required"),
  price: z.string().min(1, "Price is required"),
  taxRate: z.string().optional(),
  subtotal: z.string().optional(),
  tax: z.string().optional(),
  total: z.string().optional(),
  productId: z.number().nullable().optional(),
});

// Schema for the complete form - conditional based on whether editing
const getInvoiceFormSchema = (isEditing: boolean) => z.object({
  invoice: isEditing ? editingInvoiceSchema : extendedInvoiceSchema,
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

type InvoiceFormValues = {
  invoice: any;
  items: InvoiceItem[];
};
type InvoiceItem = z.infer<typeof invoiceItemSchema>;

interface InvoiceFormProps {
  invoiceId?: number;
  onSuccess?: () => void;
}

export function InvoiceForm({ invoiceId, onSuccess }: InvoiceFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: undefined,
      description: "",
      quantity: "1",
      price: "0",
      taxRate: "0",
      subtotal: "0",
      tax: "0",
      total: "0",
      productId: null
    }
  ]);

  // Fetch clients for the dropdown
  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
  });

  // Fetch products for product selection
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
  });

  // If editing an existing invoice, fetch its data
  const { data: invoiceData, isLoading: isLoadingInvoice } = useQuery({
    queryKey: ['/api/invoices', invoiceId],
    enabled: !!invoiceId,
  });

  // For new invoices, fetch the next invoice number preview with fallback
  const { data: nextInvoiceNumberData, isError: isNumberError } = useQuery({
    queryKey: ['/api/invoices/next-number'],
    enabled: !invoiceId, // Only for new invoices
  });
  
  // Generate fallback number if API fails
  const generateFallbackInvoiceNumber = () => {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    return `INV-${year}${month}-0001`;
  };
  
  const nextInvoiceNumber = nextInvoiceNumberData?.invoiceNumber || 
    (isNumberError ? generateFallbackInvoiceNumber() : null);

  // Form setup with conditional schema
  const invoiceFormSchema = getInvoiceFormSchema(!!invoiceId);
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoice: {
        ...(invoiceId && { invoiceNumber: "" }),
        storeId: 1,
        clientId: 0,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: "draft",
        totalAmount: "0",
        subtotal: "0",
        tax: "0",
        discount: "0",
        total: "0",
        notes: ""
      },
      items: items
    }
  });

  // Create/update invoice mutation
  const mutation = useMutation({
    mutationFn: async (values: InvoiceFormValues) => {
      // Format dates as ISO strings
      let invoiceData = {
        ...values.invoice,
        issueDate: values.invoice.issueDate.toISOString(),
        dueDate: values.invoice.dueDate.toISOString(),
      };
      
      // For new invoices, don't send invoiceNumber - let server generate it
      // The schema already excludes invoiceNumber for new invoices

      const formattedValues = {
        ...values,
        invoice: invoiceData
      };

      if (invoiceId) {
        // Update existing invoice
        return apiRequest('PUT', `/api/invoices/${invoiceId}`, formattedValues);
      } else {
        // Create new invoice
        return apiRequest('POST', '/api/invoices', formattedValues);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-invoices'] });
      toast({
        title: invoiceId ? "Invoice updated" : "Invoice created",
        description: invoiceId ? "Your invoice has been updated successfully." : "Your invoice has been created successfully.",
      });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${invoiceId ? "update" : "create"} invoice: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Set up the form when data is loaded  
  useEffect(() => {
    if (invoiceData) {
      // Populate form with existing invoice data
      const invoice = {
        ...invoiceData,
        issueDate: new Date(invoiceData.issueDate),
        dueDate: new Date(invoiceData.dueDate),
        subtotal: invoiceData.subtotal.toString(),
        tax: invoiceData.tax.toString(),
        discount: invoiceData.discount.toString(),
        total: invoiceData.total.toString(),
      };
      
      form.setValue('invoice', invoice);
      
      if (invoiceData.items && invoiceData.items.length > 0) {
        const formattedItems = invoiceData.items.map(item => ({
          ...item,
          quantity: item.quantity.toString(),
          price: item.price.toString(),
          taxRate: item.taxRate.toString(),
          subtotal: item.subtotal.toString(),
          tax: item.tax.toString(),
          total: item.total.toString(),
        }));
        
        setItems(formattedItems);
        form.setValue('items', formattedItems);
      }
    }
  }, [invoiceData, invoiceId, form]);

  // Calculate totals whenever items change
  useEffect(() => {
    if (items.length > 0) {
      // Calculate subtotal, tax, and total
      let subtotal = 0;
      let tax = 0;
      
      items.forEach(item => {
        subtotal += parseFloat(item.subtotal || "0");
        tax += parseFloat(item.tax || "0");
      });
      
      // Apply discount
      const discountValue = parseFloat(form.getValues('invoice.discount') || "0");
      const total = subtotal + tax - discountValue;
      
      // Update form values
      form.setValue('invoice.subtotal', subtotal.toFixed(2));
      form.setValue('invoice.tax', tax.toFixed(2));
      form.setValue('invoice.total', total.toFixed(2));
      
      // Update items in the form
      form.setValue('items', items);
    }
  }, [items, form]);

  // Add a new invoice item
  const addItem = () => {
    const newItem: InvoiceItem = {
      id: undefined,
      description: "",
      quantity: "1",
      price: "0",
      taxRate: "0",
      subtotal: "0",
      tax: "0",
      total: "0",
      productId: null
    };
    
    setItems([...items, newItem]);
  };

  // Remove an invoice item
  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    } else {
      toast({
        title: "Error",
        description: "At least one item is required",
        variant: "destructive",
      });
    }
  };

  // Update an invoice item
  const updateItem = (index: number, updatedItem: InvoiceItem) => {
    const newItems = [...items];
    newItems[index] = updatedItem;
    setItems(newItems);
  };

  // Handle product selection
  const handleProductSelect = (index: number, productId: number | null) => {
    if (!productId || !products) return;
    
    const product = products.find(p => p.id === productId);
    if (!product) {
      console.error(`Product with id ${productId} not found`);
      return;
    }
    
    try {
      const quantity = items[index].quantity || "1";
      const price = (product.price || "0").toString();
      const taxRate = (product.taxRate || "0").toString();
      const subtotal = (parseFloat(quantity) * parseFloat(price)).toFixed(2);
      const tax = (parseFloat(subtotal) * parseFloat(taxRate) / 100).toFixed(2);
      const total = (parseFloat(subtotal) + parseFloat(tax)).toFixed(2);
      
      const updatedItem: InvoiceItem = {
        ...items[index],
        description: product.name || "",
        price,
        taxRate,
        subtotal,
        tax,
        total,
        productId
      };
      
      updateItem(index, updatedItem);
    } catch (error) {
      console.error("Error updating item:", error);
      toast({
        title: "Error",
        description: "Failed to update item with product data",
        variant: "destructive",
      });
    }
  };

  // Submit the form
  const onSubmit = (values: InvoiceFormValues) => {
    mutation.mutate(values);
  };

  // Save as draft or send the invoice
  const saveAsDraft = () => {
    form.setValue('invoice.status', 'draft');
    form.handleSubmit(onSubmit)();
  };

  const saveAndSend = () => {
    form.setValue('invoice.status', 'sent');
    form.handleSubmit(onSubmit)();
  };

  const handleBackClick = () => {
    // Get the current form data
    const formData = form.getValues();
    
    // Check if there are any filled items worth saving as draft
    const hasValidItems = formData.items.some(item => 
      item.description.trim() !== '' || 
      (item.quantity !== '1' && item.quantity !== '0') ||
      (item.price !== '0' && item.price !== '')
    );
    
    // Check if basic invoice data is filled
    const hasBasicData = formData.invoice.clientId || 
                        formData.invoice.notes?.trim();

    // If there's meaningful data and this is a new invoice, save as draft
    if ((hasValidItems || hasBasicData) && !invoiceId) {
      // Filter out empty items - keep items with description, productId, or modified values
      const validItems = formData.items.filter(item => 
        item.description.trim() !== '' || 
        item.productId !== null ||
        (item.quantity !== '1' && item.quantity !== '0') ||
        (item.price !== '0' && item.price !== '')
      );

      // Only save if there are items to save
      if (validItems.length > 0) {
        toast({
          title: "Saving Draft",
          description: "Saving your progress as draft...",
        });
        
        form.setValue('invoice.status', 'draft');
        form.setValue('items', validItems);
        
        form.handleSubmit(onSubmit, () => {
          // On error, still navigate back
          onSuccess?.();
        })();
        return;
      }
    }
    
    // If no meaningful data or this is an edit, just navigate back
    onSuccess?.();
  };
  
  // Handle invoice PDF generation
  const handleGeneratePDF = async () => {
    if (!form.formState.isValid) {
      form.trigger();
      return;
    }
    
    const values = form.getValues();
    
    // Check if clients data is loaded
    if (!clients || !Array.isArray(clients)) {
      toast({
        title: "Error",
        description: "Client data is not available yet. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    // Find the selected client
    const client = clients.find(c => c.id === values.invoice.clientId);
    
    if (!client) {
      toast({
        title: "Error",
        description: "Please select a client to generate PDF",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Prepare safe data for PDF
      const safeClient = {
        name: client.name || "Client Name",
        email: client.email || "client@example.com",
        phone: client.phone,
        address: client.address,
        taxNumber: client.taxNumber,
      };

      const safeInvoice = {
        invoiceNumber: values.invoice.invoiceNumber || `INV-${Date.now()}`,
        issueDate: format(values.invoice.issueDate || new Date(), 'MMM dd, yyyy'),
        dueDate: format(values.invoice.dueDate || new Date(), 'MMM dd, yyyy'),
        status: values.invoice.status || "draft",
        subtotal: values.invoice.subtotal || "0",
        tax: values.invoice.tax || "0",
        discount: values.invoice.discount || "0",
        total: values.invoice.total || "0",
        notes: values.invoice.notes,
      };
      
      console.log("Generating PDF with:", { 
        invoice: safeInvoice,
        items: values.items,
        client: safeClient
      });

      await generatePDF({
        invoice: safeInvoice,
        items: values.items || [],
        client: safeClient
      });
      
      toast({
        title: "Success",
        description: "Invoice PDF has been generated",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Error",
        description: `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // If loading invoice data, show loading state
  if (invoiceId && isLoadingInvoice) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="border-0 shadow-none">
          <CardHeader className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur-sm border-b z-10 dark:bg-gray-900/95">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBackClick}
              className="h-9"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-xl font-semibold text-gray-900">
              {invoiceId ? "Edit Invoice" : "Create New Invoice"}
            </CardTitle>
            <div className="w-9"></div> {/* Spacer to center title */}
          </CardHeader>
          
          <CardContent className="p-4 md:p-6">
            <div className="space-y-6">
              {/* Invoice Details Section */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Invoice Number field - auto-generated for new invoices, display for existing */}
                  <div>
                    <FormLabel>Invoice Number</FormLabel>
                    <Input 
                      value={invoiceId ? (invoiceData?.invoiceNumber || "") : (nextInvoiceNumber || generateFallbackInvoiceNumber())}
                      readOnly 
                      className="bg-gray-50 dark:bg-gray-800" 
                      data-testid="input-invoice-number"
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="invoice.issueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} 
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="invoice.dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} 
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Client Section */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Client Information</h4>
                
                <div className="mb-4">
                  <FormField
                    control={form.control}
                    name="invoice.clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Client</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="-- Select Client --" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients?.map((client) => (
                              <SelectItem key={client.id} value={client.id.toString()}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Items Section */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Invoice Items</h4>
                
                <div className="overflow-x-auto mb-4 invoice-table-container">
                  <table className="excel-table min-w-full">
                    <thead>
                      <tr>
                        <th scope="col" className="excel-header-cell text-center" style={{ width: '40px' }}>
                          #
                        </th>
                        <th scope="col" className="excel-header-cell text-left" style={{ width: '40%' }}>
                          Item / Description
                        </th>
                        <th scope="col" className="excel-header-cell text-right" style={{ width: '100px' }}>
                          Quantity
                        </th>
                        <th scope="col" className="excel-header-cell text-right" style={{ width: '120px' }}>
                          Unit Price
                        </th>
                        <th scope="col" className="excel-header-cell text-right" style={{ width: '100px' }}>
                          Tax (%)
                        </th>
                        <th scope="col" className="excel-header-cell text-right" style={{ width: '120px' }}>
                          Subtotal
                        </th>
                        <th scope="col" className="excel-header-cell text-right" style={{ width: '120px' }}>
                          Total
                        </th>
                        <th scope="col" className="excel-header-cell text-center" style={{ width: '50px' }}>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <InvoiceItemRow
                          key={index}
                          index={index}
                          item={item}
                          products={products || []}
                          updateItem={updateItem}
                          removeItem={removeItem}
                          onProductSelect={handleProductSelect}
                        />
                      ))}
                      {/* Add row button inside the table */}
                      <tr>
                        <td colSpan={8} className="px-3 py-2 border-t border-gray-200">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={addItem}
                            className="w-full text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Plus className="h-4 w-4 mr-1.5" />
                            <span>Add New Row</span>
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Totals Section */}
              <div className="border-t border-gray-200 pt-4">
                <div className="sm:w-1/2 ml-auto">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">Subtotal:</span>
                      <span className="text-gray-900">{formatCurrency(parseFloat(form.watch('invoice.subtotal') || '0'))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">Tax:</span>
                      <span className="text-gray-900">{formatCurrency(parseFloat(form.watch('invoice.tax') || '0'))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">Discount:</span>
                      <div className="flex items-center space-x-2">
                        <FormField
                          control={form.control}
                          name="invoice.discount"
                          render={({ field }) => (
                            <FormItem className="w-20">
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number"
                                  min="0"
                                  className="text-right h-8"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <span className="text-gray-900">-{formatCurrency(parseFloat(form.watch('invoice.discount') || '0'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-base pt-2 border-t border-gray-200">
                      <span className="font-semibold text-gray-900">Total:</span>
                      <span className="font-bold text-gray-900">{formatCurrency(parseFloat(form.watch('invoice.total') || '0'))}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Notes Section */}
              <div>
                <FormField
                  control={form.control}
                  name="invoice.notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={3}
                          placeholder="Payment terms, conditions, or additional information..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-end space-x-3 p-4 md:p-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleGeneratePDF}
              disabled={mutation.isPending}
            >
              <Printer className="mr-1.5 h-4 w-4" />
              <span>Print Invoice</span>
            </Button>
            <Button
              type="button"
              onClick={saveAndSend}
              disabled={mutation.isPending}
            >
              <Check className="mr-1.5 h-4 w-4" />
              <span>{invoiceId ? 'Update Invoice' : 'Create Invoice'}</span>
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
